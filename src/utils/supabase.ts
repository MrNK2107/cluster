import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkspaceData } from '../types';
import { sanitizeWorkspace } from './validate';

/**
 * Account storage via Supabase.
 *
 * Security notes
 * - The project URL and anon / publishable key come only from the deployment
 *   environment (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Users never
 *   enter or see credentials.
 * - Only the anon key may ever be configured here; Row Level Security limits
 *   every row to its owner.
 * - The SDK is imported lazily so the first paint does not wait for it.
 */

const ENV_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const ENV_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const isCloudConfigured = Boolean(ENV_URL && ENV_KEY);

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isCloudConfigured) return Promise.resolve(null);
  if (clientPromise) return clientPromise;

  clientPromise = import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(ENV_URL, ENV_KEY))
    .catch((err) => {
      console.error('Account service is unavailable', err);
      clientPromise = null;
      return null;
    });
  return clientPromise;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/**
 * Calls `onChange` with the signed-in user (or null) now and whenever auth
 * changes. Token refreshes for the same user are not reported. `onRecovery`
 * fires when the user arrives from a password-reset email.
 */
export async function subscribeToAuth(
  onChange: (user: AuthUser | null) => void,
  onRecovery?: () => void,
): Promise<() => void> {
  const client = await getSupabaseClient();
  if (!client) {
    onChange(null);
    return () => {};
  }
  let lastId: string | null | undefined;
  const { data } = client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') onRecovery?.();
    const id = session?.user.id ?? null;
    if (id === lastId) return;
    lastId = id;
    onChange(session ? toAuthUser(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

function toAuthUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AuthUser {
  const meta = user.user_metadata ?? {};
  const name = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : null;
  const avatar = typeof meta.avatar_url === 'string' ? meta.avatar_url : typeof meta.picture === 'string' ? meta.picture : null;
  return { id: user.id, email: user.email ?? null, name, avatarUrl: avatar && /^https:\/\//.test(avatar) ? avatar : null };
}

export async function signOut(): Promise<void> {
  const client = await getSupabaseClient();
  await client?.auth.signOut();
}

/** Where auth emails and OAuth send the user back to: this app's root. */
const appUrl = () => `${window.location.origin}/`;

async function requireClient(): Promise<SupabaseClient> {
  const client = await getSupabaseClient();
  if (!client) throw new Error('Accounts are not available right now.');
  return client;
}

/** Starts Google sign-in. Resolves with an error message, or never returns (the page navigates away). */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    const client = await requireClient();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl(), queryParams: { prompt: 'select_account' } },
    });
    if (error) {
      if (/provider is not enabled|unsupported provider/i.test(error.message)) {
        return 'Google sign-in isn’t switched on for this app yet. Use email for now.';
      }
      return describeError(error);
    }
    return null;
  } catch (err) {
    return describeError(err);
  }
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const client = await requireClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Creates an account. `needsConfirmation` is true when email confirmation is on. */
export async function signUpWithPassword(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const client = await requireClient();
  const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function sendPasswordReset(email: string): Promise<void> {
  const client = await requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const client = await requireClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

/**
 * If an OAuth or email link bounced back with an error (e.g. the user
 * cancelled Google sign-in), return a readable message and clean the URL.
 */
export function readAuthRedirectError(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const raw = params.get('error_description') ?? hash.get('error_description');
  if (!raw) return null;
  window.history.replaceState(null, '', window.location.pathname);
  const text = raw.replace(/\+/g, ' ');
  if (/access_denied|cancel/i.test(text)) return 'Google sign-in was cancelled.';
  if (/expired|invalid/i.test(text)) return 'That link has expired. Request a new one and try again.';
  return text.length < 160 ? text : 'Sign-in didn’t complete. Please try again.';
}

// --- Error presentation -----------------------------------------------------

/**
 * Turn SDK / PostgREST errors into messages fit for an end user. Auth
 * messages are already user-facing; database errors are not, so they are
 * replaced with a short hint rather than leaking internals.
 */
export function describeError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err || typeof err !== 'object') return fallback;
  const e = err as { message?: unknown; code?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message : '';

  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'The account service is not ready yet. Please try again later.';
  }
  if (code === '42501' || /row-level security/i.test(message)) {
    return 'Permission denied. Try signing out and back in.';
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Could not reach the server. Check your connection.';
  }
  const authLike = /invalid login|email|password|user|signup|confirm|rate limit|too many/i.test(message);
  if (authLike && message.length < 160) return message;
  return fallback;
}

// --- Workspace storage ------------------------------------------------------

/** Returns the signed-in user's saved workspace, or null if they have none yet. */
export async function fetchCloudWorkspace(): Promise<{ data: WorkspaceData | null; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { data: null };

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return { data: null };

    const { data, error } = await client
      .from('workspaces')
      .select('data')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) return { data: null, error: describeError(error) };
    if (!data?.data) return { data: null };
    return { data: sanitizeWorkspace(data.data) };
  } catch (err) {
    return { data: null, error: describeError(err) };
  }
}

export async function saveCloudWorkspace(workspace: WorkspaceData): Promise<{ success: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { success: false };

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return { success: false };

    const { error } = await client
      .from('workspaces')
      .upsert(
        { user_id: session.user.id, data: workspace, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
}

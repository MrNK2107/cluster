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
}

/**
 * Calls `onChange` with the signed-in user (or null) now and whenever auth
 * changes. Token refreshes for the same user are not reported.
 */
export async function subscribeToAuth(onChange: (user: AuthUser | null) => void): Promise<() => void> {
  const client = await getSupabaseClient();
  if (!client) {
    onChange(null);
    return () => {};
  }
  let lastId: string | null | undefined;
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (id === lastId) return;
    lastId = id;
    onChange(session ? { id: session.user.id, email: session.user.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const client = await getSupabaseClient();
  await client?.auth.signOut();
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

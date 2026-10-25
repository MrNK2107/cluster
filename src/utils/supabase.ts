import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkspaceData } from '../types';
import { sanitizeWorkspace } from './validate';

/**
 * Cloud sync via Supabase.
 *
 * Security notes
 * - Only the *anon / publishable* key may ever reach the browser. A service
 *   role key is rejected outright.
 * - The key is never read back into the UI. Callers get a masked hint only.
 * - The SDK is imported lazily so visitors who never enable sync do not
 *   download it.
 * - Credentials can come from build-time env (set by whoever deploys) or from
 *   a user-supplied project stored in localStorage. The user's choice wins.
 */

const STORAGE_URL_KEY = 'clustr_supabase_url';
const STORAGE_ANON_KEY = 'clustr_supabase_anon_key';

const ENV_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const ENV_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const hasEnvCredentials = Boolean(ENV_URL && ENV_KEY);

let clientPromise: Promise<SupabaseClient | null> | null = null;
let clientCredentialSig = '';

function readLocal(key: string): string {
  try {
    return (localStorage.getItem(key) ?? '').trim();
  } catch {
    return '';
  }
}

function getCredentials(): { url: string; key: string; source: 'custom' | 'env' | 'none' } {
  const localUrl = readLocal(STORAGE_URL_KEY);
  const localKey = readLocal(STORAGE_ANON_KEY);
  if (localUrl && localKey) return { url: localUrl, key: localKey, source: 'custom' };
  if (hasEnvCredentials) return { url: ENV_URL, key: ENV_KEY, source: 'env' };
  return { url: '', key: '', source: 'none' };
}

export interface ConnectionInfo {
  configured: boolean;
  /** Where the active credentials come from. */
  source: 'custom' | 'env' | 'none';
  /** Hostname only, e.g. `abcd.supabase.co`. Safe to display. */
  host: string;
  /** Masked key hint such as `••••3fM`. Never the full key. */
  keyHint: string;
  /** Whether the saved project URL can be pre-filled (not secret). */
  url: string;
}

export function getConnectionInfo(): ConnectionInfo {
  const { url, key, source } = getCredentials();
  let host = '';
  try {
    host = url ? new URL(url).host : '';
  } catch {
    host = '';
  }
  return {
    configured: Boolean(url && key),
    source,
    host,
    keyHint: key ? `••••${key.slice(-3)}` : '',
    url,
  };
}

// --- Validation -------------------------------------------------------------

export function validateProjectUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'Enter the full project URL, e.g. https://abcd.supabase.co' };
  }
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
    return { ok: false, error: 'Project URL must use https://' };
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    return { ok: false, error: 'Project URL should be just the origin, without a path or query' };
  }
  return { ok: true, url: parsed.origin };
}

function decodeJwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function validateAnonKey(raw: string): { ok: true; key: string } | { ok: false; error: string } {
  const key = raw.trim();
  if (!key) return { ok: false, error: 'Enter the anon / publishable API key' };
  if (/\s/.test(key)) return { ok: false, error: 'The key should not contain spaces' };

  if (key.startsWith('sb_secret_')) {
    return { ok: false, error: 'That is a secret key. Never put it in a browser app. Use the publishable key instead.' };
  }
  if (key.startsWith('sb_publishable_')) return { ok: true, key };

  const role = decodeJwtRole(key);
  if (role === 'service_role') {
    return { ok: false, error: 'That is the service_role key. Never put it in a browser app. Use the anon key instead.' };
  }
  if (role === 'anon') return { ok: true, key };
  if (key.startsWith('eyJ')) return { ok: true, key }; // JWT we could not decode fully; let Supabase reject it
  return { ok: false, error: 'This does not look like a Supabase anon or publishable key' };
}

// --- Credential storage -----------------------------------------------------

export function saveSupabaseCredentials(url: string, key: string): { ok: boolean; error?: string } {
  const u = validateProjectUrl(url);
  if (!u.ok) return { ok: false, error: u.error };
  const k = validateAnonKey(key);
  if (!k.ok) return { ok: false, error: k.error };
  try {
    localStorage.setItem(STORAGE_URL_KEY, u.url);
    localStorage.setItem(STORAGE_ANON_KEY, k.key);
  } catch {
    return { ok: false, error: 'Could not save credentials in this browser' };
  }
  resetClient();
  return { ok: true };
}

export async function clearSupabaseCredentials(): Promise<void> {
  try {
    const client = await getSupabaseClient();
    await client?.auth.signOut();
  } catch {
    // Signing out is best effort; we are discarding the connection anyway.
  }
  try {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
  } catch {
    // ignore
  }
  resetClient();
}

function resetClient(): void {
  clientPromise = null;
  clientCredentialSig = '';
}

// --- Client -----------------------------------------------------------------

export function getSupabaseClient(): Promise<SupabaseClient | null> {
  const { url, key } = getCredentials();
  if (!url || !key) return Promise.resolve(null);

  const sig = `${url}\u0000${key}`;
  if (clientPromise && clientCredentialSig === sig) return clientPromise;

  clientCredentialSig = sig;
  clientPromise = import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(url, key))
    .catch((err) => {
      console.error('Cloud sync is unavailable', err);
      resetClient();
      return null;
    });
  return clientPromise;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const client = await getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

// --- Error presentation -----------------------------------------------------

/**
 * Turn SDK / PostgREST errors into messages fit for an end user. Auth
 * messages are already user-facing; database errors are not, so they are
 * replaced with a short hint rather than leaking internals.
 */
export function describeError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err || typeof err !== 'object') return fallback;
  const e = err as { message?: unknown; code?: unknown; status?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message : '';

  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'The cloud table has not been created yet. Run the setup SQL in your Supabase project.';
  }
  if (code === '42501' || /row-level security/i.test(message)) {
    return 'Permission denied by the database policy. Check the setup SQL was run completely.';
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Could not reach the cloud project. Check the project URL and your connection.';
  }
  if (/invalid api key|jwt|apikey/i.test(message)) {
    return 'The project rejected the API key. Re-enter the anon key from your Supabase dashboard.';
  }
  const authLike = /invalid login|email|password|user|signup|confirm|rate limit|too many/i.test(message);
  if (authLike && message.length < 160) return message;
  return fallback;
}

// --- Workspace sync ---------------------------------------------------------

export async function fetchCloudWorkspace(): Promise<{ data: WorkspaceData | null; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { data: null, error: 'Cloud sync is not set up yet.' };

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { data: null, error: 'Sign in to pull your workspace.' };

    const { data, error } = await client
      .from('workspaces')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return { data: null, error: describeError(error) };
    if (!data?.data) return { data: null, error: 'No workspace has been pushed from this account yet.' };

    const workspace = sanitizeWorkspace(data.data);
    if (!workspace) return { data: null, error: 'The cloud copy is not a valid workspace.' };
    return { data: workspace };
  } catch (err) {
    return { data: null, error: describeError(err) };
  }
}

export async function syncWorkspaceToSupabase(workspace: WorkspaceData): Promise<{ success: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud sync is not set up yet.' };

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'Sign in to push your workspace.' };

    const { error } = await client
      .from('workspaces')
      .upsert(
        { user_id: user.id, data: workspace, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
}

export const SUPABASE_SQL_SETUP = `-- Run this once in your Supabase SQL Editor:
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workspaces enable row level security;

create policy "Users can manage their own workspace" on public.workspaces
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
`;

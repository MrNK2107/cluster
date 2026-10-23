import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { WorkspaceData } from '../types';

const STORAGE_SUPABASE_URL_KEY = 'clustr_supabase_url';
const STORAGE_SUPABASE_KEY_KEY = 'clustr_supabase_anon_key';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || envUrl;
  const localKey = localStorage.getItem(STORAGE_SUPABASE_KEY_KEY) || envKey;

  return { url: localUrl.trim(), key: localKey.trim() };
}

export function saveSupabaseCredentials(url: string, key: string): void {
  localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_SUPABASE_KEY_KEY, key.trim());
  supabaseInstance = null; // reset client instance
}

export function clearSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
  localStorage.removeItem(STORAGE_SUPABASE_KEY_KEY);
  supabaseInstance = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseCredentials();
  if (url && key) {
    try {
      supabaseInstance = createClient(url, key);
      return supabaseInstance;
    } catch (e) {
      console.error('Failed to create Supabase client', e);
    }
  }
  return null;
}

export async function fetchCloudWorkspace(): Promise<{ data: WorkspaceData | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase credentials not configured' };

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated. Please sign in.' };

    const { data, error } = await client
      .from('workspaces')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (data && data.data) {
      return { data: data.data as WorkspaceData };
    }
    return { data: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Unknown cloud fetch error' };
  }
}

export async function syncWorkspaceToSupabase(workspace: WorkspaceData): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase credentials not configured' };

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated. Please sign in.' };

    const { error } = await client
      .from('workspaces')
      .upsert({
        user_id: user.id,
        data: workspace,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sync' };
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

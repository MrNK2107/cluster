import type { BoardDocument, ShareInfo, SpacePerson } from '../types';
import { describeError, getSupabaseClient } from './supabase';
import { sanitizeDocument } from './validate';

/**
 * Spaces shared between accounts (see supabase/migrations/*_shared_spaces.sql).
 *
 * A shared space is one row in `shared_spaces`; the owner and everyone listed
 * in `space_members` read and write that same row. Row Level Security limits
 * each row to those people. The canvas position is kept per person in their
 * own workspace, so it is never written to the shared row.
 */

export interface SharedSpace {
  doc: BoardDocument;
  share: ShareInfo;
}

export interface Person {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Member {
  userId: string;
  email: string;
}

export const sharedDocId = (spaceId: string) => `space-${spaceId}`;

const DEFAULT_VIEWPORT = { x: 80, y: 80, zoom: 1 };

/** What is written to the shared row: the space without anyone's camera position. */
export function sharedPayload(doc: BoardDocument): BoardDocument {
  const { share: _share, ...rest } = doc;
  return { ...rest, viewport: DEFAULT_VIEWPORT };
}

/** The database has no sharing tables yet: behave as if nothing is shared. */
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST202' ||
    /does not exist|could not find the (table|function)/i.test(error.message ?? '')
  );
}

async function sessionUserId(): Promise<string | null> {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.user.id ?? null;
}

/** Every space the signed-in user owns or was added to. */
export async function fetchSharedSpaces(): Promise<{ data: SharedSpace[]; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { data: [] };
  try {
    const me = await sessionUserId();
    if (!me) return { data: [] };
    const { data, error } = await client
      .from('shared_spaces')
      .select('id, owner_id, owner_email, doc')
      .order('created_at', { ascending: true });
    if (error) return isMissingTable(error) ? { data: [] } : { data: [], error: describeError(error) };
    const rows = (data ?? []) as { id: string; owner_id: string; owner_email: string | null; doc: unknown }[];

    // Everyone in each space, so a rejection knows how many must agree.
    const membersBySpace = new Map<string, SpacePerson[]>();
    if (rows.length) {
      const res = await client.from('space_members').select('space_id, user_id, email');
      if (res.error) return { data: [], error: describeError(res.error) };
      for (const m of (res.data ?? []) as { space_id: string; user_id: string; email: string }[]) {
        const list = membersBySpace.get(m.space_id) ?? [];
        list.push({ userId: m.user_id, email: m.email });
        membersBySpace.set(m.space_id, list);
      }
    }

    const spaces: SharedSpace[] = [];
    for (const row of rows) {
      const doc = sanitizeDocument(row.doc);
      if (!doc) continue;
      const ownerEmail = row.owner_email ?? '';
      const members = (membersBySpace.get(row.id) ?? []).sort((a, b) => a.email.localeCompare(b.email));
      spaces.push({
        doc: { ...doc, id: sharedDocId(row.id) },
        share: {
          spaceId: row.id,
          ownerId: row.owner_id,
          ownerEmail,
          isOwner: row.owner_id === me,
          people: [{ userId: row.owner_id, email: ownerEmail }, ...members],
        },
      });
    }
    return { data: spaces };
  } catch (err) {
    return { data: [], error: describeError(err) };
  }
}

/** Turns one of the owner's spaces into a shared one. Returns the new space id. */
export async function createSharedSpace(doc: BoardDocument): Promise<{ spaceId?: string; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { error: 'Sharing needs an account connection.' };
  try {
    const { data, error } = await client
      .from('shared_spaces')
      .insert({ doc: sharedPayload(doc) })
      .select('id')
      .single();
    if (error) {
      return { error: isMissingTable(error) ? 'Sharing isn’t switched on for this app yet.' : describeError(error) };
    }
    const spaceId = (data as { id: string }).id;
    // Store the id the space now goes by, so every copy agrees on it.
    const withId = sharedPayload({ ...doc, id: sharedDocId(spaceId) });
    await client.from('shared_spaces').update({ doc: withId }).eq('id', spaceId);
    return { spaceId };
  } catch (err) {
    return { error: describeError(err) };
  }
}

/** The latest saved copy of one shared space, or null if it is gone or no longer shared with you. */
export async function fetchSharedSpace(spaceId: string): Promise<{ doc: BoardDocument | null; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { doc: null };
  try {
    const { data, error } = await client.from('shared_spaces').select('doc').eq('id', spaceId).maybeSingle();
    if (error) return { doc: null, error: describeError(error) };
    const doc = data ? sanitizeDocument((data as { doc: unknown }).doc) : null;
    return { doc: doc ? { ...doc, id: sharedDocId(spaceId) } : null };
  } catch (err) {
    return { doc: null, error: describeError(err) };
  }
}

export async function saveSharedSpace(spaceId: string, doc: BoardDocument): Promise<{ success: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { error } = await client
      .from('shared_spaces')
      .update({ doc: sharedPayload(doc), updated_at: new Date().toISOString() })
      .eq('id', spaceId);
    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
}

/** Owner only: stops sharing and removes the shared copy for everyone. */
export async function deleteSharedSpace(spaceId: string): Promise<{ success: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { error } = await client.from('shared_spaces').delete().eq('id', spaceId);
    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
}

export async function searchPeople(query: string): Promise<{ data: Person[]; error?: string }> {
  const q = query.trim();
  if (q.length < 3) return { data: [] };
  const client = await getSupabaseClient();
  if (!client) return { data: [] };
  try {
    const { data, error } = await client.rpc('search_users', { q });
    if (error) {
      return { data: [], error: isMissingTable(error) ? 'Sharing isn’t switched on for this app yet.' : describeError(error) };
    }
    return {
      data: ((data ?? []) as { id: string; email: string; name: string | null; avatar_url: string | null }[]).map((p) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        avatarUrl: p.avatar_url && /^https:\/\//.test(p.avatar_url) ? p.avatar_url : null,
      })),
    };
  } catch (err) {
    return { data: [], error: describeError(err) };
  }
}

export async function fetchMembers(spaceId: string): Promise<{ data: Member[]; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { data: [] };
  try {
    const { data, error } = await client.from('space_members').select('user_id, email').eq('space_id', spaceId);
    if (error) return { data: [], error: describeError(error) };
    return { data: ((data ?? []) as { user_id: string; email: string }[]).map((m) => ({ userId: m.user_id, email: m.email })) };
  } catch (err) {
    return { data: [], error: describeError(err) };
  }
}

export async function addMember(spaceId: string, person: Person): Promise<{ success: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { error } = await client.from('space_members').insert({ space_id: spaceId, user_id: person.id, email: person.email });
    if (error) {
      if (error.code === '23505') return { success: true }; // Already in the space.
      return { success: false, error: describeError(error) };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
}

/** Owner removes someone, or a member leaves (userId = themselves). */
export async function removeMember(spaceId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { success: false };
  try {
    const { error } = await client.from('space_members').delete().eq('space_id', spaceId).eq('user_id', userId);
    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: describeError(err) };
  }
}

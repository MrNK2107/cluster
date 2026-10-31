import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase, type FakeSupabase } from '../test/fakeSupabase';
import { createStarterWorkspace as sharedStarter } from './storage';

const createStarterWorkspace = () => structuredClone(sharedStarter());

// Placeholder values only: nothing here is a real project or key.
const TEST_URL = 'https://unit-test.invalid';
const TEST_KEY = 'test-anon-key';

let fake: FakeSupabase;
let createClient: ReturnType<typeof vi.fn>;

async function loadModule(configured = true) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', configured ? TEST_URL : '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', configured ? TEST_KEY : '');
  vi.doMock('@supabase/supabase-js', () => ({ createClient }));
  return import('./supabase');
}

beforeEach(() => {
  fake = createFakeSupabase();
  createClient = vi.fn(() => fake.client);
});

afterEach(() => {
  vi.doUnmock('@supabase/supabase-js');
});

describe('client setup', () => {
  it('is disabled without env credentials and never loads the SDK', async () => {
    const mod = await loadModule(false);
    expect(mod.isCloudConfigured).toBe(false);
    await expect(mod.getSupabaseClient()).resolves.toBeNull();
    await expect(mod.fetchCloudWorkspace()).resolves.toEqual({ data: null });
    await expect(mod.saveCloudWorkspace(createStarterWorkspace())).resolves.toEqual({ success: false });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('creates one client from the env credentials and reuses it', async () => {
    const mod = await loadModule();
    const [a, b] = await Promise.all([mod.getSupabaseClient(), mod.getSupabaseClient()]);
    expect(a).toBe(fake.client);
    expect(b).toBe(a);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(TEST_URL, TEST_KEY);
  });

  it('retries client creation after a failed SDK load', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createClient = vi.fn(() => {
      throw new Error('chunk failed');
    });
    const mod = await loadModule();
    await expect(mod.getSupabaseClient()).resolves.toBeNull();
    expect(errSpy).toHaveBeenCalled();
    createClient.mockImplementation(() => fake.client);
    await expect(mod.getSupabaseClient()).resolves.toBe(fake.client);
  });
});

describe('auth subscription', () => {
  it('reports the current user and ignores token refreshes for the same user', async () => {
    const mod = await loadModule();
    const seen: unknown[] = [];
    const unsubscribe = await mod.subscribeToAuth((u) => seen.push(u));
    await Promise.resolve();
    expect(seen).toEqual([null]);

    fake.signIn('u1', 'a@example.test');
    fake.refreshToken();
    expect(seen).toEqual([null, { id: 'u1', email: 'a@example.test' }]);

    await mod.signOut();
    expect(seen.at(-1)).toBeNull();

    unsubscribe();
    fake.signIn('u2');
    expect(seen).toHaveLength(3);
  });

  it('reports signed-out immediately when accounts are not configured', async () => {
    const mod = await loadModule(false);
    const onChange = vi.fn();
    await mod.subscribeToAuth(onChange);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('workspace store', () => {
  it('returns nothing for signed-out users without querying the table', async () => {
    const mod = await loadModule();
    await expect(mod.fetchCloudWorkspace()).resolves.toEqual({ data: null });
    await expect(mod.saveCloudWorkspace(createStarterWorkspace())).resolves.toEqual({ success: false });
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('creates, reads back and overwrites the signed-in user row', async () => {
    const mod = await loadModule();
    fake.signIn('u1');
    await expect(mod.fetchCloudWorkspace()).resolves.toEqual({ data: null });

    const ws = createStarterWorkspace();
    await expect(mod.saveCloudWorkspace(ws)).resolves.toEqual({ success: true });
    expect(fake.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', data: ws }),
      { onConflict: 'user_id' },
    );
    expect((await mod.fetchCloudWorkspace()).data).toEqual(ws);

    const renamed = { ...ws, documents: [{ ...ws.documents[0], title: 'Renamed' }] };
    await mod.saveCloudWorkspace(renamed);
    expect(fake.rows.size).toBe(1);
    expect((await mod.fetchCloudWorkspace()).data?.documents[0].title).toBe('Renamed');
  });

  it('keeps users apart: each user only reads their own row', async () => {
    const mod = await loadModule();
    fake.signIn('u1');
    await mod.saveCloudWorkspace(createStarterWorkspace());
    fake.signIn('u2');
    await expect(mod.fetchCloudWorkspace()).resolves.toEqual({ data: null });
  });

  it('sanitizes rows read back from the database', async () => {
    const mod = await loadModule();
    fake.signIn('u1');
    fake.rows.set('u1', {
      user_id: 'u1',
      updated_at: '',
      data: {
        activeDocId: 'missing',
        documents: [{ id: 'd1', cards: [{ id: 'c1', type: 'links', bookmarks: [{ url: 'javascript:alert(1)' }] }] }],
      },
    });
    const { data } = await mod.fetchCloudWorkspace();
    expect(data?.activeDocId).toBe('d1');
    expect(data?.documents[0].cards[0].bookmarks).toEqual([]);
  });

  it('treats an unreadable row as no workspace', async () => {
    const mod = await loadModule();
    fake.signIn('u1');
    fake.rows.set('u1', { user_id: 'u1', updated_at: '', data: { documents: 'nope' } });
    await expect(mod.fetchCloudWorkspace()).resolves.toEqual({ data: null });
  });

  it('maps database and network failures to friendly messages', async () => {
    const mod = await loadModule();
    fake.signIn('u1');

    fake.failures.select = { message: 'relation "public.workspaces" does not exist', code: '42P01' };
    expect((await mod.fetchCloudWorkspace()).error).toMatch(/not ready yet/);

    fake.failures.upsert = { message: 'new row violates row-level security policy', code: '42501' };
    expect(await mod.saveCloudWorkspace(createStarterWorkspace())).toEqual({
      success: false,
      error: 'Permission denied. Try signing out and back in.',
    });

    fake.failures.upsert = new TypeError('Failed to fetch');
    expect((await mod.saveCloudWorkspace(createStarterWorkspace())).error).toMatch(/Could not reach the server/);
    fake.failures.select = new TypeError('Failed to fetch');
    expect((await mod.fetchCloudWorkspace()).error).toMatch(/Could not reach the server/);
  });
});

describe('describeError', () => {
  it('passes short auth messages through and hides database internals', async () => {
    const { describeError } = await loadModule();
    expect(describeError({ message: 'Invalid login credentials' })).toBe('Invalid login credentials');
    expect(describeError({ message: 'syntax error at or near "select"', code: '42601' })).toBe(
      'Something went wrong. Please try again.',
    );
    expect(describeError(null, 'fallback')).toBe('fallback');
  });
});

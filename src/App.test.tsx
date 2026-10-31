import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFakeSupabase, type FakeSupabase } from './test/fakeSupabase';
import { createStarterWorkspace as sharedStarter } from './utils/storage';
import type { WorkspaceData } from './types';

const LEGACY_KEY = 'clustr_workspace_v1';
// The starter data shares module-level objects; copy it before editing.
const createStarterWorkspace = (): WorkspaceData => structuredClone(sharedStarter());
const SAVE_WAIT = { timeout: 3000 };

let fake: FakeSupabase;

async function renderApp({ configured = true } = {}) {
  vi.resetModules();
  // Placeholder values only: the SDK is replaced by an in-memory fake.
  vi.stubEnv('VITE_SUPABASE_URL', configured ? 'https://unit-test.invalid' : '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', configured ? 'test-anon-key' : '');
  vi.doMock('@supabase/supabase-js', () => ({ createClient: () => fake.client }));
  const { default: App } = await import('./App');
  return render(<App />);
}

function storedRow(userId = 'u1'): WorkspaceData {
  return fake.rows.get(userId)?.data as WorkspaceData;
}

function seedRow(userId: string, ws: WorkspaceData) {
  fake.rows.set(userId, { user_id: userId, data: structuredClone(ws), updated_at: '' });
}

async function signedInApp(ws = createStarterWorkspace()) {
  seedRow('u1', ws);
  fake.signIn('u1', 'me@example.test');
  await renderApp();
  await screen.findByText('me@example.test');
}

const toggleTheme = () => fireEvent.click(screen.getByTitle(/Switch to (Light|Dark) mode/));

async function signOutViaAccountModal() {
  fireEvent.click(screen.getByText('me@example.test'));
  fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
}

beforeEach(() => {
  fake = createFakeSupabase();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.doUnmock('@supabase/supabase-js');
});

describe('sign-in guard', () => {
  it('shows only the sign-in form to signed-out users', async () => {
    await renderApp();
    expect(await screen.findByPlaceholderText('name@email.com')).toBeTruthy();
    expect(screen.queryByTitle('Toggle Documents Sidebar')).toBeNull();
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('explains that accounts are unavailable when Supabase is not configured', async () => {
    await renderApp({ configured: false });
    expect(screen.getByText(/Accounts are not available/)).toBeTruthy();
    expect(screen.queryByPlaceholderText('name@email.com')).toBeNull();
  });

  it('shows a loading state, not the workspace or the form, while auth is unknown', async () => {
    fake.client.auth.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn(() => true) } },
    }));
    await renderApp();
    expect(screen.getByText(/Loading your spaces/)).toBeTruthy();
    expect(screen.queryByPlaceholderText('name@email.com')).toBeNull();
    expect(screen.queryByTitle('Toggle Documents Sidebar')).toBeNull();
  });

  it('returns to the sign-in form after signing out', async () => {
    await signedInApp();
    await signOutViaAccountModal();
    expect(await screen.findByPlaceholderText('name@email.com')).toBeTruthy();
    expect(screen.queryByText('me@example.test')).toBeNull();
  });
});

describe('loading the account workspace', () => {
  it('opens the saved workspace for a returning user', async () => {
    const ws = createStarterWorkspace();
    ws.documents[0].title = 'Saved remotely';
    await signedInApp(ws);
    expect(screen.getAllByText('Saved remotely').length).toBeGreaterThan(0);
  });

  it('moves the old browser-only workspace into a new account', async () => {
    const legacy = createStarterWorkspace();
    legacy.documents[0].title = 'From this browser';
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
    fake.signIn('new-user', 'new@example.test');
    await renderApp();
    await screen.findByText('new@example.test');

    expect(storedRow('new-user').documents[0].title).toBe('From this browser');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('keeps the browser copy when creating the account workspace fails', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(createStarterWorkspace()));
    fake.failures.upsert = { message: 'new row violates row-level security policy', code: '42501' };
    fake.signIn('u1');
    await renderApp();
    expect(await screen.findByText(/Permission denied/)).toBeTruthy();
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
    expect(fake.rows.size).toBe(0);
  });

  it('shows load errors with a working retry', async () => {
    seedRow('u1', createStarterWorkspace());
    fake.failures.select = new TypeError('Failed to fetch');
    fake.signIn('u1', 'me@example.test');
    await renderApp();
    expect(await screen.findByText(/Could not reach the server/)).toBeTruthy();

    delete fake.failures.select;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('me@example.test')).toBeTruthy();
  });
});

describe('autosave and sync', () => {
  it('saves edits to the account shortly after they are made', async () => {
    await signedInApp();
    toggleTheme();
    await waitFor(() => expect(storedRow().theme).toBe('light'), SAVE_WAIT);
    expect(fake.upsert).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTitle('All changes saved')).toBeTruthy());
  });

  it('shows a save error and retries until the write succeeds', async () => {
    await signedInApp();
    fake.failures.upsert = new TypeError('Failed to fetch');
    toggleTheme();
    await waitFor(() => expect(screen.getByTitle('Could not save. Retrying…')).toBeTruthy(), SAVE_WAIT);
    delete fake.failures.upsert;
    await waitFor(() => expect(storedRow().theme).toBe('light'), { timeout: 8000 });
    await waitFor(() => expect(screen.getByTitle('All changes saved')).toBeTruthy());
  }, 12000);

  it('picks up changes made on another device when the window regains focus', async () => {
    await signedInApp();
    const remote = createStarterWorkspace();
    remote.documents[0].title = 'Edited elsewhere';
    seedRow('u1', remote);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(screen.getAllByText('Edited elsewhere').length).toBeGreaterThan(0));
    // Adopting the remote copy is not itself a new edit to write back.
    await new Promise((r) => setTimeout(r, 900));
    expect(fake.upsert).not.toHaveBeenCalled();
  });

  it('does not let a remote copy overwrite unsaved local edits', async () => {
    await signedInApp();
    fake.failures.upsert = new TypeError('Failed to fetch');
    toggleTheme(); // a local edit that cannot be saved yet
    await waitFor(() => expect(screen.getByTitle('Could not save. Retrying…')).toBeTruthy(), SAVE_WAIT);

    const remote = createStarterWorkspace();
    remote.documents[0].title = 'Edited elsewhere';
    seedRow('u1', remote);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.queryByText('Edited elsewhere')).toBeNull();
    expect(screen.getByTitle('Switch to Dark mode')).toBeTruthy();
  });

  it('saves edits made during an in-flight save before signing out', async () => {
    await signedInApp();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const realUpsert = fake.upsert.getMockImplementation()!;
    fake.upsert.mockImplementationOnce(async (row, opts) => {
      await gate;
      return realUpsert(row, opts);
    });

    toggleTheme(); // dark -> light; this request is held open
    await waitFor(() => expect(fake.upsert).toHaveBeenCalledTimes(1), SAVE_WAIT);
    toggleTheme(); // light -> dark while the first save is still in flight

    await signOutViaAccountModal();
    release();

    expect(await screen.findByPlaceholderText('name@email.com')).toBeTruthy();
    expect(storedRow().theme).toBe('dark');
  });
});

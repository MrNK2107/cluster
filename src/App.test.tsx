import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFakeSupabase, type FakeSupabase } from './test/fakeSupabase';
import { createStarterWorkspace as sharedStarter } from './utils/storage';
import type { WorkspaceData } from './types';

const LEGACY_KEY = 'clustr_workspace_v1';
// The starter data shares module-level objects; copy it before editing.
const createStarterWorkspace = (): WorkspaceData => structuredClone(sharedStarter());
const SAVE_WAIT = { timeout: 3000 };
// A workspace the person has edited, so loading it does not clean out sample spaces.
const createEditedWorkspace = (): WorkspaceData => {
  const ws = createStarterWorkspace();
  ws.documents.forEach((d) => (d.title = `${d.title} (edited)`));
  return ws;
};

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

async function signedInApp(ws = createEditedWorkspace()) {
  seedRow('u1', ws);
  fake.signIn('u1', 'me@example.test');
  await renderApp();
  await screen.findByText('me@example.test');
}

const toggleTheme = () => fireEvent.click(screen.getByTitle(/Use (light|dark) theme/));
const emailField = () => screen.getByLabelText('Email');
const passwordField = () => screen.getByLabelText('Password');

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
    expect(await screen.findByLabelText('Email')).toBeTruthy();
    expect(screen.queryByLabelText('Spaces')).toBeNull();
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('explains that accounts are unavailable when Supabase is not configured', async () => {
    await renderApp({ configured: false });
    expect(screen.getByText(/Sign-in is off/)).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('shows a loading state, not the workspace or the form, while auth is unknown', async () => {
    fake.client.auth.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn(() => true) } },
    }));
    await renderApp();
    expect(screen.getByText(/Loading your spaces/)).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByLabelText('Spaces')).toBeNull();
  });

  it('validates the form before contacting the server', async () => {
    await renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address.')).toBeTruthy();
    expect(fake.client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('shows the error for wrong credentials and stays on the form', async () => {
    fake.accounts.set('me@example.test', { id: 'u1', password: 'right' });
    await renderApp();
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'me@example.test' } });
    fireEvent.change(passwordField(), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid login credentials')).toBeTruthy();
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('asks new users to confirm their email instead of opening a workspace', async () => {
    await renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Create an account' }));
    fireEvent.change(emailField(), { target: { value: ' new@example.test ' } });
    fireEvent.change(passwordField(), { target: { value: 'secret-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/We sent a confirmation link/)).toBeTruthy();
    expect(fake.client.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.test', password: 'secret-pass' }));
    expect(fake.client.from).not.toHaveBeenCalled();
  });

  it('opens the workspace after a successful sign-in', async () => {
    fake.accounts.set('me@example.test', { id: 'u1', password: 'right' });
    seedRow('u1', createStarterWorkspace());
    await renderApp();
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'me@example.test' } });
    fireEvent.change(passwordField(), { target: { value: 'right' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('me@example.test')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('returns to the sign-in form after signing out', async () => {
    await signedInApp();
    await signOutViaAccountModal();
    expect(await screen.findByLabelText('Email')).toBeTruthy();
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
    fake.signIn('new-user', 'nandakishorsureshpriya@gmail.com');
    await renderApp();
    await screen.findByText('nandakishorsureshpriya@gmail.com');

    expect(storedRow('new-user').documents[0].title).toBe('From this browser');
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('does not give the browser-only workspace to any other new account', async () => {
    const legacy = createStarterWorkspace();
    legacy.documents[0].title = 'From this browser';
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
    fake.signIn('stranger', 'stranger@example.test');
    await renderApp();
    await screen.findByText('stranger@example.test');

    const ws = storedRow('stranger');
    expect(ws.documents).toHaveLength(1);
    expect(ws.documents[0].cards).toEqual([]);
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });

  it('removes untouched sample spaces from an existing account but keeps edited ones', async () => {
    const ws = createStarterWorkspace();
    ws.documents[1].cards[0].title = 'My own edit';
    seedRow('u3', ws);
    fake.signIn('u3', 'other@example.test');
    await renderApp();
    await screen.findByText('other@example.test');

    const stored = storedRow('u3');
    expect(stored.documents.map((d) => d.id)).toEqual(['doc-life-scratchpad']);
    expect(stored.activeDocId).toBe('doc-life-scratchpad');
  });

  it('replaces an all-sample workspace with one empty space', async () => {
    seedRow('u4', createStarterWorkspace());
    fake.signIn('u4', 'other@example.test');
    await renderApp();
    await screen.findByText('other@example.test');

    const stored = storedRow('u4');
    expect(stored.documents).toHaveLength(1);
    expect(stored.documents[0].cards).toEqual([]);
  });

  it('gives a brand-new account one empty space instead of sample content', async () => {
    fake.signIn('fresh-user', 'fresh@example.test');
    await renderApp();
    await screen.findByText('fresh@example.test');

    const ws = storedRow('fresh-user');
    expect(ws.documents).toHaveLength(1);
    expect(ws.documents[0].cards).toEqual([]);
    expect(ws.documents[0].clusters).toEqual([]);
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

  it('switches to the other account without mixing workspaces', async () => {
    const mine = createStarterWorkspace();
    mine.documents[0].title = 'Mine';
    const theirs = createStarterWorkspace();
    theirs.documents[0].title = 'Theirs';
    theirs.theme = 'light';
    seedRow('u2', theirs);
    await signedInApp(mine);

    toggleTheme(); // pending local edit for u1 when the session changes
    await act(async () => {
      fake.signIn('u2', 'them@example.test');
    });
    expect(await screen.findByText('them@example.test')).toBeTruthy();
    expect(screen.getAllByText('Theirs').length).toBeGreaterThan(0);

    await new Promise((r) => setTimeout(r, 900));
    expect(storedRow('u2').documents[0].title).toBe('Theirs');
    expect(storedRow('u2').theme).toBe('light');
    expect(storedRow('u1').documents[0].title).toBe('Mine');
  });

  it('shows load errors with a working retry', async () => {
    seedRow('u1', createStarterWorkspace());
    fake.failures.select = new TypeError('Failed to fetch');
    fake.signIn('u1', 'me@example.test');
    await renderApp();
    expect(await screen.findByText(/Could not reach the server/)).toBeTruthy();

    delete fake.failures.select;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('me@example.test')).toBeTruthy();
  });
});

describe('autosave and sync', () => {
  it('saves edits to the account shortly after they are made', async () => {
    await signedInApp();
    toggleTheme();
    await waitFor(() => expect(storedRow().theme).toBe('light'), SAVE_WAIT);
    expect(fake.upsert).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
  });

  it('shows a save error and retries until the write succeeds', async () => {
    await signedInApp();
    fake.failures.upsert = new TypeError('Failed to fetch');
    toggleTheme();
    await waitFor(() => expect(screen.getByText('Not saved')).toBeTruthy(), SAVE_WAIT);
    delete fake.failures.upsert;
    await waitFor(() => expect(storedRow().theme).toBe('light'), { timeout: 8000 });
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
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
    await waitFor(() => expect(screen.getByText('Not saved')).toBeTruthy(), SAVE_WAIT);

    const remote = createStarterWorkspace();
    remote.documents[0].title = 'Edited elsewhere';
    seedRow('u1', remote);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.queryByText('Edited elsewhere')).toBeNull();
    expect(screen.getByTitle('Use dark theme')).toBeTruthy();
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

    expect(await screen.findByLabelText('Email')).toBeTruthy();
    expect(storedRow().theme).toBe('dark');
  });
});

describe('sharing a space', () => {
  const OWNER_WS = (): WorkspaceData => {
    const ws = createEditedWorkspace();
    ws.documents[0].title = 'Hackathon plan';
    ws.documents[0].icon = '🚀';
    ws.documents[1].title = 'Private notes';
    ws.activeDocId = ws.documents[0].id;
    return ws;
  };

  async function shareWithTeammate() {
    fake.addUser('u2', 'teammate@example.test', 'Team Mate');
    await signedInApp(OWNER_WS());
    fireEvent.click(screen.getByTitle('Share this space'));
    fireEvent.change(screen.getByPlaceholderText('Search by email'), { target: { value: 'team' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add teammate@example.test' }));
    await waitFor(() => expect(fake.members).toHaveLength(1));
  }

  it('finds people by email and gives them the space', async () => {
    await shareWithTeammate();
    const [space] = [...fake.spaces.values()];
    expect((space.doc as BoardDocumentLike).title).toBe('Hackathon plan');
    expect(fake.members[0]).toMatchObject({ user_id: 'u2', email: 'teammate@example.test' });
    // The space moves out of the owner's own row; their other spaces stay.
    await waitFor(() => expect(storedRow('u1').documents.map((d) => d.title)).toEqual(['Private notes']), SAVE_WAIT);
    expect(screen.getByTitle('People in this space')).toBeTruthy();
  });

  it('says when no account matches the email', async () => {
    await signedInApp(OWNER_WS());
    fireEvent.click(screen.getByTitle('Share this space'));
    fireEvent.change(screen.getByPlaceholderText('Search by email'), { target: { value: 'nobody@' } });
    expect(await screen.findByText(/need to sign in to clustr once/)).toBeTruthy();
    expect(fake.spaces.size).toBe(0);
  });

  it('lets the person it was shared with open and edit it', async () => {
    await shareWithTeammate();
    await waitFor(() => expect(storedRow('u1').documents).toHaveLength(1), SAVE_WAIT);
    await act(async () => {
      fake.signIn('u2', 'teammate@example.test');
    });
    fireEvent.click(await screen.findByText('Hackathon plan'));
    fireEvent.click(screen.getByTitle('Rename space'));
    const input = screen.getByLabelText('Space name');
    fireEvent.change(input, { target: { value: 'Team plan' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(([...fake.spaces.values()][0].doc as BoardDocumentLike).title).toBe('Team plan'), SAVE_WAIT);
    // Their own account row never holds the shared space.
    expect(storedRow('u2').documents.map((d) => d.title)).toEqual(['My space']);
    expect(screen.queryByText('Private notes')).toBeNull();
  });

  it('adds people as view only: they can read the space but not change it', async () => {
    fake.addUser('u2', 'teammate@example.test', 'Team Mate');
    await signedInApp(OWNER_WS());
    fireEvent.click(screen.getByTitle('Share this space'));
    fireEvent.click(screen.getByRole('radio', { name: 'View only' }));
    fireEvent.change(screen.getByPlaceholderText('Search by email'), { target: { value: 'team' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add teammate@example.test' }));
    await waitFor(() => expect(fake.members).toHaveLength(1));
    expect(fake.members[0]).toMatchObject({ user_id: 'u2', role: 'view' });
    await waitFor(() => expect(storedRow('u1').documents).toHaveLength(1), SAVE_WAIT);

    await act(async () => {
      fake.signIn('u2', 'teammate@example.test');
    });
    fireEvent.click(await screen.findByText('Hackathon plan'));
    expect(await screen.findByText(/View only ·/)).toBeTruthy();

    // Renaming is ignored on screen, and the database would refuse it anyway.
    fireEvent.click(screen.getByTitle('Rename space'));
    const input = screen.getByLabelText('Space name');
    fireEvent.change(input, { target: { value: 'Hijacked' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await new Promise((r) => setTimeout(r, 1800));
    expect(([...fake.spaces.values()][0].doc as BoardDocumentLike).title).toBe('Hackathon plan');
  });

  it('lets the owner change someone from view only to edit', async () => {
    fake.addUser('u2', 'teammate@example.test', 'Team Mate');
    await signedInApp(OWNER_WS());
    fireEvent.click(screen.getByTitle('Share this space'));
    fireEvent.click(screen.getByRole('radio', { name: 'View only' }));
    fireEvent.change(screen.getByPlaceholderText('Search by email'), { target: { value: 'team' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add teammate@example.test' }));
    await waitFor(() => expect(fake.members[0]?.role).toBe('view'));
    fireEvent.change(await screen.findByLabelText('Access for teammate@example.test'), { target: { value: 'edit' } });
    await waitFor(() => expect(fake.members[0].role).toBe('edit'));
  });

  it('lets a member leave', async () => {
    await shareWithTeammate();
    await act(async () => {
      fake.signIn('u2', 'teammate@example.test');
    });
    await screen.findByText('Hackathon plan');
    fireEvent.click(screen.getByLabelText('Options for Hackathon plan'));
    fireEvent.click(screen.getByText('Leave space'));
    fireEvent.click(screen.getByText('Click again to leave'));
    await waitFor(() => expect(fake.members).toHaveLength(0));
    await waitFor(() => expect(screen.queryByText('Hackathon plan')).toBeNull());
    expect(fake.spaces.size).toBe(1);
  });

  it('stops sharing and keeps the space in the owner’s account', async () => {
    await shareWithTeammate();
    fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Click again to stop sharing' }));
    await waitFor(() => expect(fake.spaces.size).toBe(0));
    expect(fake.members).toHaveLength(0);
    await waitFor(
      () => expect(storedRow('u1').documents.map((d) => d.title).sort()).toEqual(['Hackathon plan', 'Private notes']),
      SAVE_WAIT,
    );
  });

  it('still opens the workspace when the database has no sharing tables yet', async () => {
    fake.failures.sharingMissing = true;
    await signedInApp(OWNER_WS());
    expect(screen.getAllByText('Hackathon plan').length).toBeGreaterThan(0);
  });
});

type BoardDocumentLike = { title: string };

describe('table view and rejecting entries', () => {
  const openTable = () => fireEvent.click(screen.getByRole('radio', { name: 'Table' }));
  const shared = () => [...fake.spaces.values()][0].doc as WorkspaceData['documents'][number];

  it('deletes straight away in a space that is not shared', async () => {
    await signedInApp();
    openTable();
    expect(screen.getByRole('list', { name: 'Entries' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Check-in Desk Priority' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: delete Check-in Desk Priority' }));
    await waitFor(
      () => expect(storedRow('u1').documents[0].cards.some((c) => c.title === 'Check-in Desk Priority')).toBe(false),
      SAVE_WAIT,
    );
  });

  it('opens big spaces as a table', async () => {
    const ws = createEditedWorkspace();
    ws.documents[0].cards = Array.from({ length: 31 }, (_, i) => ({
      id: `c${i}`,
      type: 'todo' as const,
      title: `⏰ Nov ${i % 28 + 1} · Hackathon ${i}`,
      x: 0,
      y: 0,
      color: 'default' as const,
      tags: [],
      clusterId: null,
      createdAt: 1,
      updatedAt: 1,
    }));
    ws.documents[0].connections = [];
    await signedInApp(ws);
    expect(screen.getByRole('list', { name: 'Entries' })).toBeTruthy();
    expect(screen.getByText('Hackathon 30')).toBeTruthy();
  });

  it('in a shared space, deletes only after everyone agrees', async () => {
    fake.addUser('u2', 'teammate@example.test');
    await signedInApp();
    fireEvent.click(screen.getByTitle('Share this space'));
    fireEvent.change(screen.getByPlaceholderText('Search by email'), { target: { value: 'team' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add teammate@example.test' }));
    await waitFor(() => expect(fake.members).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    openTable();
    fireEvent.click(screen.getByRole('button', { name: 'Propose rejecting Check-in Desk Priority' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: propose rejecting Check-in Desk Priority' }));
    expect(await screen.findByText(/proposed rejecting this · 1 of 2 agreed/)).toBeTruthy();
    await waitFor(() => {
      const card = shared().cards.find((c) => c.title === 'Check-in Desk Priority');
      expect(card?.rejection?.approvals).toEqual(['u1']);
    }, SAVE_WAIT);

    await act(async () => {
      fake.signIn('u2', 'teammate@example.test');
    });
    fireEvent.click(await screen.findByText(/Property & Hostel Operations/));
    fireEvent.click(await screen.findByRole('button', { name: /Agree to reject/ }));
    await waitFor(() => expect(shared().cards.some((c) => c.title === 'Check-in Desk Priority')).toBe(false), SAVE_WAIT);
  });

  it('keeps the entry when someone says keep it', async () => {
    fake.addUser('u2', 'teammate@example.test');
    await signedInApp();
    fireEvent.click(screen.getByTitle('Share this space'));
    fireEvent.change(screen.getByPlaceholderText('Search by email'), { target: { value: 'team' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Add teammate@example.test' }));
    await waitFor(() => expect(fake.members).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    openTable();
    fireEvent.click(screen.getByRole('button', { name: 'Propose rejecting Check-in Desk Priority' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: propose rejecting Check-in Desk Priority' }));
    fireEvent.click(await screen.findByRole('button', { name: /Cancel/ }));
    await waitFor(() => {
      const card = shared().cards.find((c) => c.title === 'Check-in Desk Priority');
      expect(card).toBeTruthy();
      expect(card?.rejection).toBeUndefined();
    }, SAVE_WAIT);
  });
});

describe('protected spaces and owner deletes', () => {
  const SID = '00000000-0000-4000-8000-0000000000aa';
  const DOC_ID = `space-${SID}`;
  const openTable = () => fireEvent.click(screen.getByRole('radio', { name: 'Table' }));
  type SharedDoc = WorkspaceData['documents'][number];
  const row = () => fake.spaces.get(SID)?.doc as SharedDoc;
  const entry = (title: string) => row().cards.find((c) => c.title === title);

  /** The owner u1 (me@example.test) shares "Opportunities" with `members`. */
  function seedSharedSpace({ protectedSpace = false, members = ['u2'], rejections = {} as Record<string, string[]> } = {}) {
    const cards = ['Alpha', 'Beta', 'Gamma'].map((title, i) => ({
      id: `h-${i}`,
      type: 'note' as const,
      title,
      x: 0,
      y: 0,
      color: 'default' as const,
      tags: [],
      clusterId: null,
      createdAt: 1,
      updatedAt: 1,
      ...(rejections[title]
        ? { rejection: { id: `rj-${i}`, byId: rejections[title][0], byEmail: '', at: 1, approvals: rejections[title] } }
        : {}),
    }));
    const doc: SharedDoc = {
      id: DOC_ID,
      title: 'Opportunities',
      icon: '🎯',
      color: '#6366f1',
      createdAt: 1,
      updatedAt: 1,
      clusters: [],
      cards,
      connections: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      ...(protectedSpace ? { protected: true } : {}),
    };
    fake.spaces.set(SID, { id: SID, owner_id: 'u1', owner_email: 'me@example.test', doc, created_at: '0' });
    members.forEach((m) => fake.members.push({ space_id: SID, user_id: m, email: `${m}@example.test` }));
  }

  /** Opens the app as `userId` with the shared space in front. */
  async function openAs(userId: string, email: string) {
    const ws = createEditedWorkspace();
    ws.activeDocId = DOC_ID;
    seedRow(userId, ws);
    fake.signIn(userId, email);
    await renderApp();
    await screen.findByText(email);
  }

  it('offers the owner no way to delete or stop sharing a protected space', async () => {
    seedSharedSpace({ protectedSpace: true });
    await openAs('u1', 'me@example.test');
    expect(screen.getByLabelText('Protected: can’t be deleted')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Options for Opportunities'));
    expect(screen.queryByText('Delete for everyone')).toBeNull();
    expect(screen.queryByText(/Delete space/)).toBeNull();
    expect(screen.getByText('Duplicate space')).toBeTruthy();

    fireEvent.click(screen.getByText('Share…'));
    expect(await screen.findByText(/This space is protected: it stays shared/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Stop sharing/ })).toBeNull();
    // The owner can still remove people.
    fireEvent.click(await screen.findByRole('button', { name: 'Remove u2@example.test' }));
    await waitFor(() => expect(fake.members).toHaveLength(0));
    expect(fake.spaces.has(SID)).toBe(true);
  });

  it('lets a member leave a protected space but not delete it', async () => {
    seedSharedSpace({ protectedSpace: true });
    await openAs('u2', 'u2@example.test');
    fireEvent.click(screen.getByLabelText('Options for Opportunities'));
    expect(screen.queryByText('Delete for everyone')).toBeNull();
    fireEvent.click(screen.getByText('Leave space'));
    fireEvent.click(screen.getByText('Click again to leave'));
    await waitFor(() => expect(fake.members).toHaveLength(0));
    expect(fake.spaces.has(SID)).toBe(true);
    expect(row().protected).toBe(true);
  });

  it('keeps a protected space protected after edits, and its copy is ordinary', async () => {
    seedSharedSpace({ protectedSpace: true });
    await openAs('u1', 'me@example.test');
    openTable();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: delete Alpha now' }));
    await waitFor(() => expect(entry('Alpha')).toBeUndefined(), SAVE_WAIT);
    expect(row().protected).toBe(true);

    fireEvent.click(screen.getByLabelText('Options for Opportunities'));
    fireEvent.click(screen.getByText('Duplicate space'));
    await waitFor(
      () => expect(storedRow('u1').documents.some((d) => d.title === 'Opportunities copy')).toBe(true),
      SAVE_WAIT,
    );
    expect(storedRow('u1').documents.find((d) => d.title === 'Opportunities copy')).not.toHaveProperty('protected');
  });

  it('never deletes a protected space that is not shared', async () => {
    const ws = createEditedWorkspace();
    ws.documents[0].protected = true;
    await signedInApp(ws);
    fireEvent.click(screen.getByLabelText(`Options for ${ws.documents[0].title}`));
    expect(screen.queryByText('Delete space')).toBeNull();
    // Another space still can be deleted.
    fireEvent.click(screen.getByLabelText(`Options for ${ws.documents[1].title}`));
    expect(screen.getByText('Delete space')).toBeTruthy();
  });

  it('lets the owner delete an entry straight away', async () => {
    seedSharedSpace();
    await openAs('u1', 'me@example.test');
    openTable();
    expect(screen.getByRole('button', { name: 'Propose rejecting Beta' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Beta now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: delete Beta now' }));
    await waitFor(() => expect(entry('Beta')).toBeUndefined(), SAVE_WAIT);
    expect(entry('Alpha')).toBeTruthy();
  });

  it('lets the owner vote on a proposal, or delete it outright', async () => {
    seedSharedSpace({ members: ['u2', 'u3'], rejections: { Alpha: ['u2'], Gamma: ['u3'] } });
    await openAs('u1', 'me@example.test');
    openTable();
    expect(screen.getAllByText(/proposed rejecting this · 1 of 3 agreed/)).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /Agree to reject/ })[0]);
    await waitFor(() => expect(entry('Alpha')?.rejection?.approvals).toEqual(['u2', 'u1']), SAVE_WAIT);

    const gammaRow = screen.getByText('Gamma').closest('li')!;
    const deleteNow = Array.from(gammaRow.querySelectorAll('button')).find((b) => b.textContent?.includes('Delete now'))!;
    fireEvent.click(deleteNow);
    await waitFor(() => expect(entry('Gamma')).toBeUndefined(), SAVE_WAIT);
    expect(entry('Alpha')?.rejection?.approvals).toEqual(['u2', 'u1']);
  });

  it('still only proposes when a member deletes', async () => {
    seedSharedSpace();
    await openAs('u2', 'u2@example.test');
    openTable();
    expect(screen.queryByRole('button', { name: 'Delete Beta now' })).toBeNull();
    expect(screen.queryByText('Delete now')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Propose rejecting Beta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: propose rejecting Beta' }));
    await waitFor(() => expect(entry('Beta')?.rejection?.approvals).toEqual(['u2']), SAVE_WAIT);
    expect(screen.queryByText('Delete now')).toBeNull();
  });

  it('deletes once the owner and every member agree', async () => {
    seedSharedSpace({ members: ['u2', 'u3'], rejections: { Beta: ['u3', 'u1'] } });
    await openAs('u2', 'u2@example.test');
    openTable();
    expect(screen.getByText(/proposed rejecting this · 2 of 3 agreed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Agree to reject/ }));
    await waitFor(() => expect(entry('Beta')).toBeUndefined(), SAVE_WAIT);
  });

  it('deletes when the last two people agree at the same time', async () => {
    seedSharedSpace({ members: ['u2', 'u3'], rejections: { Beta: ['u1'] } });
    await openAs('u2', 'u2@example.test');
    openTable();
    // u3 agrees on another device before u2's vote is saved.
    const beta = row().cards.find((c) => c.title === 'Beta')!;
    beta.rejection!.approvals = ['u1', 'u3'];
    fireEvent.click(screen.getByRole('button', { name: /Agree to reject/ }));
    await waitFor(() => expect(entry('Beta')).toBeUndefined(), SAVE_WAIT);
    await waitFor(() => expect(screen.queryByText('Beta')).toBeNull(), SAVE_WAIT);
  });

  it('puts an entry back when the database says not everyone has agreed yet', async () => {
    seedSharedSpace({ rejections: { Beta: ['u1'] } });
    await openAs('u2', 'u2@example.test');
    openTable();
    // Someone joins after u2 opened the space, so u2's vote is not the last one.
    fake.members.push({ space_id: SID, user_id: 'u3', email: 'u3@example.test' });
    fireEvent.click(screen.getByRole('button', { name: /Agree to reject/ }));
    await waitFor(() => expect(entry('Beta')?.rejection?.approvals).toEqual(['u1', 'u2']), SAVE_WAIT);
    expect(await screen.findByText('Beta')).toBeTruthy();
  });
});

import { vi } from 'vitest';

/**
 * In-memory stand-in for the parts of the Supabase client the app uses:
 * auth session / state events and the `workspaces` table (one row per user).
 */
export interface FakeSession {
  user: { id: string; email?: string };
}

type AuthCallback = (event: string, session: FakeSession | null) => void;
type DbError = { message: string; code?: string };

export function createFakeSupabase() {
  const rows = new Map<string, { user_id: string; data: unknown; updated_at: string }>();
  const listeners = new Set<AuthCallback>();
  const accounts = new Map<string, { id: string; password: string }>();
  let session: FakeSession | null = null;
  const failures: { select?: DbError | Error; upsert?: DbError | Error } = {};

  const emit = (event: string) => listeners.forEach((cb) => cb(event, session));

  const auth = {
    getSession: vi.fn(async () => ({ data: { session } })),
    onAuthStateChange: vi.fn((cb: AuthCallback) => {
      listeners.add(cb);
      queueMicrotask(() => cb('INITIAL_SESSION', session));
      return { data: { subscription: { unsubscribe: vi.fn(() => listeners.delete(cb)) } } };
    }),
    signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
      const account = accounts.get(email);
      if (!account || account.password !== password) {
        return { data: { session: null }, error: { message: 'Invalid login credentials', status: 400 } };
      }
      session = { user: { id: account.id, email } };
      emit('SIGNED_IN');
      return { data: { session }, error: null };
    }),
    signUp: vi.fn(async ({ email, password }: { email: string; password: string }) => {
      accounts.set(email, { id: `user-${accounts.size + 1}`, password });
      // Email confirmation is on: no session until the link is clicked.
      return { data: { session: null, user: { email } }, error: null };
    }),
    signOut: vi.fn(async () => {
      session = null;
      emit('SIGNED_OUT');
      return { error: null };
    }),
  };

  const upsert = vi.fn(async (row: { user_id: string; data: unknown; updated_at: string }, _opts?: unknown) => {
    const f = failures.upsert;
    if (f instanceof Error) throw f;
    if (f) return { error: f };
    rows.set(row.user_id, structuredClone(row));
    return { error: null };
  });

  const from = vi.fn((table: string) => {
    if (table !== 'workspaces') throw new Error(`unexpected table ${table}`);
    return {
      select: () => ({
        eq: (_col: string, userId: string) => ({
          maybeSingle: async () => {
            const f = failures.select;
            if (f instanceof Error) throw f;
            if (f) return { data: null, error: f };
            const row = rows.get(userId);
            return { data: row ? { data: structuredClone(row.data) } : null, error: null };
          },
        }),
      }),
      upsert,
    };
  });

  return {
    client: { auth, from },
    rows,
    accounts,
    upsert,
    failures,
    signIn(id: string, email = `${id}@example.test`) {
      session = { user: { id, email } };
      emit('SIGNED_IN');
    },
    refreshToken() {
      emit('TOKEN_REFRESHED');
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

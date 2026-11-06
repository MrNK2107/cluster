import { vi } from 'vitest';

/**
 * In-memory stand-in for the parts of the Supabase client the app uses:
 * auth session / state events, the `workspaces` table (one row per user),
 * and shared spaces (`shared_spaces`, `space_members`, `search_users`) with
 * the same access rules as the database policies.
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
  const failures: { select?: DbError | Error; upsert?: DbError | Error; sharingMissing?: boolean } = {};

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

  // --- Shared spaces ---------------------------------------------------------
  type SpaceRow = { id: string; owner_id: string; owner_email: string; doc: unknown; created_at: string };
  type MemberRow = { space_id: string; user_id: string; email: string; role?: 'edit' | 'view' };
  const spaces = new Map<string, SpaceRow>();
  const members: MemberRow[] = [];
  const users = new Map<string, { id: string; email: string; name: string | null; avatar_url: string | null }>();
  let spaceSeq = 0;
  const me = () => session?.user.id ?? null;
  const isMember = (sid: string) => members.some((m) => m.space_id === sid && m.user_id === me());
  const isOwnerOf = (sid: string) => spaces.get(sid)?.owner_id === me();
  const canSee = (sid: string) => isOwnerOf(sid) || isMember(sid);
  /** The owner, or a member who was given edit access (supabase/migrations/*_member_roles.sql). */
  const canEdit = (sid: string) => isOwnerOf(sid) || members.some((m) => m.space_id === sid && m.user_id === me() && m.role !== 'view');

  /**
   * The rules from supabase/migrations/*_protected_spaces.sql: a protected
   * space can't be deleted or unprotected; someone other than the owner may
   * remove a card only once the owner and every member agreed (removing it
   * counts as their own vote), and may add only their own vote.
   */
  type Doc = { protected?: boolean; cards?: { id: string; rejection?: { id: string; approvals?: string[] } }[] };
  const isProtected = (doc: unknown) => (doc as Doc | null)?.protected === true;
  const guardUpdate = (row: SpaceRow, next: Doc, uid: string): string | null => {
    const old = row.doc as Doc;
    if (isProtected(old) && !isProtected(next)) next.protected = true;
    if (uid === row.owner_id) return null;
    if (!isProtected(old) && isProtected(next)) delete next.protected;
    const people = [row.owner_id, ...members.filter((m) => m.space_id === row.id && m.role !== 'view').map((m) => m.user_id)];
    const nextCards = next.cards ?? [];
    for (const card of old.cards ?? []) {
      if (nextCards.some((c) => c.id === card.id)) continue;
      const agreed = new Set([...(card.rejection?.approvals ?? []), uid]);
      if (!card.rejection || !people.every((p) => agreed.has(p))) {
        return `clustr_refused: only the owner can delete "${card.id}" before everyone agrees`;
      }
    }
    for (const card of nextCards) {
      if (!card.rejection) continue;
      const before = (old.cards ?? []).find((c) => c.id === card.id)?.rejection;
      const had = new Set(before && before.id === card.rejection.id ? before.approvals : []);
      if ((card.rejection.approvals ?? []).some((a) => !had.has(a) && a !== uid)) {
        return `clustr_refused: votes on "${card.id}" can only be added by the person voting`;
      }
    }
    return null;
  };

  type Filter = [string, unknown];
  const matches = (row: Record<string, unknown>, filters: Filter[]) => filters.every(([c, v]) => row[c] === v);
  const pickCols = (row: Record<string, unknown>, cols: string) =>
    Object.fromEntries(cols.split(',').map((c) => c.trim()).map((c) => [c, structuredClone(row[c])]));

  /** A small chainable query: enough of PostgREST's builder for the app's calls. */
  function query(table: 'shared_spaces' | 'space_members') {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let cols = '*';
    let payload: Record<string, unknown> = {};
    const filters: Filter[] = [];
    let returning: string | null = null;

    const run = (): { data: unknown; error: DbError | null } => {
      if (failures.sharingMissing) {
        return { data: null, error: { message: `Could not find the table 'public.${table}' in the schema cache`, code: 'PGRST205' } };
      }
      const uid = me();
      if (!uid) return { data: null, error: { message: 'not signed in', code: '42501' } };
      if (table === 'shared_spaces') {
        if (op === 'insert') {
          const id = `00000000-0000-4000-8000-${String(++spaceSeq).padStart(12, '0')}`;
          const row: SpaceRow = { id, owner_id: uid, owner_email: session?.user.email ?? '', doc: structuredClone(payload.doc), created_at: String(spaceSeq) };
          spaces.set(id, row);
          return { data: returning ? [pickCols(row, returning)] : null, error: null };
        }
        const visible = [...spaces.values()].filter((r) => canSee(r.id) && matches(r, filters));
        // Like a row-level policy: rows you can't edit are simply not updated or deleted.
        if (op === 'update' && payload.doc !== undefined) {
          const editable = visible.filter((r) => canEdit(r.id));
          visible.length = 0;
          visible.push(...editable);
        }
        if (op === 'select') return { data: visible.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((r) => (cols === '*' ? structuredClone(r) : pickCols(r, cols))), error: null };
        if (op === 'update') {
          if (payload.doc === undefined) return { data: null, error: null };
          // Checked for every row before any is written, like one statement.
          const next = visible.map((r) => ({ r, doc: structuredClone(payload.doc) as Doc }));
          for (const { r, doc } of next) {
            const refusal = guardUpdate(r, doc, uid);
            if (refusal) return { data: null, error: { message: refusal, code: 'P0001' } };
          }
          next.forEach(({ r, doc }) => (r.doc = doc));
          return { data: null, error: null };
        }
        const deleting = visible.filter((r) => isOwnerOf(r.id));
        if (deleting.some((r) => isProtected(r.doc))) {
          return { data: null, error: { message: 'clustr_refused: this space is protected and cannot be deleted', code: 'P0001' } };
        }
        deleting.forEach((r) => {
          spaces.delete(r.id);
          for (let i = members.length - 1; i >= 0; i--) if (members[i].space_id === r.id) members.splice(i, 1);
        });
        return { data: null, error: null };
      }
      // space_members
      if (op === 'insert') {
        const row = payload as unknown as MemberRow;
        if (!isOwnerOf(row.space_id) || row.user_id === uid) return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } };
        if (members.some((m) => m.space_id === row.space_id && m.user_id === row.user_id)) return { data: null, error: { message: 'duplicate key', code: '23505' } };
        members.push({ space_id: row.space_id, user_id: row.user_id, email: row.email, role: row.role === 'view' ? 'view' : 'edit' });
        return { data: null, error: null };
      }
      const visible = members.filter((m) => canSee(m.space_id) && matches(m, filters));
      if (op === 'select') return { data: visible.map((m) => pickCols(m, cols)), error: null };
      if (op === 'delete') {
        visible
          .filter((m) => isOwnerOf(m.space_id) || m.user_id === uid)
          .forEach((m) => members.splice(members.indexOf(m), 1));
        return { data: null, error: null };
      }
      if (op === 'update') {
        // Only the owner changes a role, and nothing else about a membership.
        for (const m of visible.filter((m) => isOwnerOf(m.space_id))) {
          if (payload.role === 'edit' || payload.role === 'view') m.role = payload.role;
        }
        return { data: null, error: null };
      }
      return { data: null, error: { message: 'unsupported', code: 'XX000' } };
    };

    const builder = {
      select(c = '*') {
        if (op === 'select') cols = c;
        else returning = c;
        return builder;
      },
      insert(row: Record<string, unknown>) {
        op = 'insert';
        payload = row;
        return builder;
      },
      update(row: Record<string, unknown>) {
        op = 'update';
        payload = row;
        return builder;
      },
      delete() {
        op = 'delete';
        return builder;
      },
      eq(col: string, value: unknown) {
        filters.push([col, value]);
        return builder;
      },
      order() {
        return builder;
      },
      async single() {
        const res = run();
        const rows = res.data as unknown[] | null;
        return { data: rows?.[0] ?? null, error: res.error };
      },
      async maybeSingle() {
        const res = run();
        const rows = res.data as unknown[] | null;
        return { data: rows?.[0] ?? null, error: res.error };
      },
      then<R>(resolve: (v: { data: unknown; error: DbError | null }) => R) {
        return Promise.resolve(run()).then(resolve);
      },
    };
    return builder;
  }

  const rpc = vi.fn(async (fn: string, args: { q: string }) => {
    if (fn !== 'search_users') throw new Error(`unexpected rpc ${fn}`);
    const q = args.q.trim().toLowerCase();
    if (!me() || q.length < 3) return { data: [], error: null };
    return {
      data: [...users.values()].filter((u) => u.id !== me() && u.email.toLowerCase().startsWith(q)).slice(0, 6),
      error: null,
    };
  });

  const from = vi.fn((table: string) => {
    if (table === 'shared_spaces' || table === 'space_members') return query(table);
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
    client: { auth, from, rpc },
    rows,
    spaces,
    members,
    /** Accounts that exist and can be found by email search. */
    addUser(id: string, email: string, name: string | null = null) {
      users.set(id, { id, email, name, avatar_url: null });
    },
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

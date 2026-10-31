# Night run notes

## 2026-10-31 (branch `night-run/2026-10-31`, worktree; not pushed)

Scope: tests for the 10-30 Supabase account storage and sign-in guard.

- Added Vitest + jsdom + Testing Library + fake-indexeddb (dev only); `npm test`, `npm run typecheck`.
- `src/test/fakeSupabase.ts`: in-memory Supabase client (auth events, sign-in/up, `workspaces` table, injectable failures). No network in any test.
- `src/utils/supabase.test.ts`: client setup / retry, auth dedupe, per-user rows, upsert on `user_id`, sanitizing reads, error mapping.
- `src/utils/storage.test.ts`: legacy localStorage copy + old Dexie `ClustrDB` cleanup (fake-indexeddb).
- `src/App.test.tsx`: sign-in guard (signed out, unconfigured, auth unknown, form validation, wrong password, sign-up confirmation, sign-in, sign-out), first-sign-in migration, create failure keeps local copy, load error + retry, account switch, autosave, save retry, focus refetch vs unsaved edits.
- Fix: sign-out dropped edits made while a save was in flight (`flushSave` returned early instead of waiting). Regression test included.
- Fix: starter bookmark URLs now canonical, so the first refetch after sign-up no longer looks like a remote edit and rewrites the row.

Notes / left for the owner:
- The brief mentioned spaces create/join/leave and a Dexie fallback; the 10-30 code has neither (one private workspace row per user, Dexie removed), so the tests cover what exists.
- Sync is last-write-wins: a device with unsaved edits that reconnects overwrites newer edits from another device (no `updated_at` check). Needs a design decision.
- Signing out while offline still discards unsaved edits (the final save fails and sign-out proceeds).
- `createStarterWorkspace()` returns shared module-level objects; App code is immutable so it is fine today, tests clone it.
- `npm run check:secrets -- --history`: clean; the old leak commit is no longer in local history. Key rotation can't be verified from here.
- CI does not run `npm test` yet.

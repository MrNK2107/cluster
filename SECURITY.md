# Security notes

## Incident: Supabase credentials committed to git (October 2026)

An early commit added the real Supabase project URL and anon key to `.env`,
`.env.example` and `src/utils/supabase.ts`. On 2026-10-25 the history was
rewritten with `git filter-repo` and force-pushed, so the values no longer
appear in any commit. The anon key was deliberately kept (small personal
project, Row Level Security protects the data); it is now injected only
through Vercel environment variables and a git-ignored local `.env`.

If the key is ever suspected to be abused, rotate it in the Supabase
dashboard under *Project Settings → API Keys* and update the Vercel env var.

## Guard rails now in place

- `.env` is untracked and ignored. Only `.env.example` (placeholders) is
  committed.
- `npm run check:secrets` scans the tree for keys, tokens and populated
  `VITE_*KEY` values. `npm install` sets up a pre-commit hook that runs the
  same scan on staged files. `npm run check:secrets -- --history` scans every
  commit.
- A GitHub Actions workflow runs the scanner plus gitleaks on every push.
- The browser only ever receives the **anon / publishable** key. The
  settings form rejects `service_role` and `sb_secret_` keys outright.
- The stored key is never read back into the page. The UI shows the project
  host and the last three characters of the key only.
- Database and network errors are mapped to short user-facing hints rather
  than echoing raw PostgREST messages.
- Data arriving from snapshot links, backup files and cloud pulls is
  validated and sanitised before it is rendered. Bookmark URLs are limited to
  `http`, `https`, `mailto` and `tel`.
- Vercel and Netlify deployments send a Content Security Policy and the usual
  hardening headers (see `vercel.json`, `netlify.toml`).

## What the anon key is, and is not

The Supabase anon key is designed to ship inside a browser bundle. It is not
a secret in the way a service role key is, but publishing a project's URL and
anon key in a public repository still lets strangers hit the project's Auth
and Data APIs directly, consuming quota and probing RLS. Keep it out of git,
inject it at build time, and rely on RLS for every table.

## Reporting

Open a private security advisory on the GitHub repository or contact the
maintainer directly. Please do not file public issues for security problems.

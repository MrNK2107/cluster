# Security notes

## Incident: Supabase credentials committed to git (October 2026)

Commit `84e7197` ("Configure Supabase project credentials…") added a real
Supabase project URL and its anon JWT to three tracked files:

- `.env`
- `.env.example`
- `src/utils/supabase.ts` (as `DEFAULT_SUPABASE_URL` / `DEFAULT_SUPABASE_ANON_KEY`)

Commit `23476be` blanked the values, but **they are still readable in git
history** on any clone of the public repository. Treat them as burned.

### What to do (repository owner)

1. **Rotate the key.** In the Supabase dashboard open *Project Settings →
   API Keys*. If the project uses legacy JWT keys, rotate the JWT secret
   (this invalidates the leaked anon key and signs every user out). If it
   uses the newer publishable/secret keys, revoke the leaked one and create a
   new publishable key. Update the deployment's `VITE_SUPABASE_ANON_KEY`.
2. **Check Row Level Security.** The anon key only lets a caller do what RLS
   permits. `supabase/migrations/20261023000000_create_workspaces.sql`
   restricts `workspaces` to the owning user, so no data was exposed as long
   as that policy was live. Verify no other tables exist without RLS.
3. **Check Auth settings.** With a leaked anon key anyone can call sign-up on
   the project. Enable email confirmation and consider captcha or disabling
   public sign-ups if the app is not meant to be open.
4. **Purge the history** so the values stop being served from GitHub.
   This rewrites every commit and needs a force push; coordinate with anyone
   who has a clone.

   ```bash
   pip install git-filter-repo
   git filter-repo --replace-text <(printf '%s\n' \
     'regex:eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+==>REDACTED_JWT' \
     'regex:https://[a-z0-9]{20}\.supabase\.co==>https://REDACTED.supabase.co')
   git push --force --all && git push --force --tags
   ```

   After the push, GitHub still caches old blobs for a while. Contact GitHub
   support to clear them, or simply rely on the rotation in step 1.

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

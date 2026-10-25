# Clustr ⚡ — Spatial todos, notes & clusters

> A spatial, unstructured to-do list and canvas app with multiple spaces, clusters and loose scratchpads.
> Local-first (IndexedDB), free to host as a static site, with optional cloud sync through your own Supabase project.

---

## ✨ Features

- **📱 Feed view and 🗺️ spatial canvas**
  - Feed view for phones: thumb-friendly card stacks grouped by cluster, chip navigation, 44px tap targets, sticky action bar.
  - Canvas for desktop and tablet: infinite pan and zoom, dot grid, drag-and-drop cards, relation arrows, minimap.
  - One-tap switch between the two.
- **📦 Clusters**: colour-coded grouping zones. Drag a cluster to move its cards, collapse it to tidy up, see live completion stats.
- **📝 Card types**: todo checklists with `#tags` and priorities (confetti when you finish), freeform notes, sticky notes, tally counters, bookmark lists.
- **🗂️ Multiple spaces**: independent boards, starter templates, duplicate and delete, ⌘K command palette.
- **☁️ Optional cloud sync**: sign in with email and push or pull your workspace to a Supabase project you control. Row Level Security keeps each account's data private.
- **💾 Backup and share**: JSON backup and restore, Markdown export, and snapshot links that carry a copy of a space.

---

## 🛠️ Local development

```bash
npm install          # also installs the pre-commit secret scanner
npm run dev
npm run build
npm run lint
npm run check:secrets
```

---

## ☁️ Cloud sync setup (optional)

Clustr works fully offline. To enable sync:

1. Create a project at [supabase.com](https://supabase.com).
2. In the project's **SQL Editor** run the migration in
   [`supabase/migrations/20261023000000_create_workspaces.sql`](supabase/migrations/20261023000000_create_workspaces.sql)
   (the same SQL is available from the *Copy SQL* button in the app's Cloud sync dialog).
3. Either
   - **per deployment**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time environment variables on your host
     (or in a local, git-ignored `.env`; see `.env.example`), or
   - **per user**: open **Sync** in the app, expand *Connection* and paste the project URL and anon key.
     They stay in that browser only.

Use the **anon / publishable** key only. The app rejects `service_role` and `sb_secret_` keys because they must never reach a browser.

---

## 🚀 Hosting

Everything is static; any CDN works.

- **Vercel**: import the repo and deploy. `vercel.json` adds SPA rewrites and security headers.
- **Netlify**: same, via `netlify.toml`.
- **Cloudflare Pages**: build command `npm run build`, output directory `dist`.
- **GitHub Pages**: the workflow in `.github/workflows/deploy.yml` builds and publishes `dist` on every push to `main`.

Set the two `VITE_SUPABASE_*` variables in the host's environment settings if you want sync pre-configured for visitors.

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for the guard rails in this repo and for the
history of a credential leak that requires the Supabase key to be rotated.

- `.env` is git-ignored. A pre-commit hook and a CI workflow block commits that contain keys or tokens.
- Only the anon key is ever bundled or stored; it is never echoed back into the UI.
- Imported data (snapshot links, backups, cloud pulls) is validated before rendering, and bookmark links are limited to `http(s)`, `mailto` and `tel`.

---

## 📄 License

MIT

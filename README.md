# Clustr ⚡ — Free Unstructured Spatial Todos & Clusters

> A spatial, unstructured to-do list & canvas app with multiple documents, clusters, and loose scratchpads. **100% free to host forever** with zero server costs, zero maintenance, and instant offline-ready performance.
> Now with **Mobile-First Responsive Feed View** and **Free Supabase Cloud Sync**!

---

## ✨ Features

- **📱 Mobile-First Responsive Feed & 🗺️ Spatial Canvas**:
  - **Feed View (Mobile-First)**: Thumb-friendly card stacks organized by Cluster, horizontal chip navigation, 44px tap targets for easy one-hand checkoffs, and a sticky bottom action bar.
  - **Spatial Canvas (Desktop/Tablet)**: Infinite smooth pan & zoom canvas with custom dot grid, drag-and-drop cards, and relation arrows.
  - Seamless 1-tap switcher between **Feed View** and **Canvas View**.
- **☁️ 100% Free Supabase Cloud Sync**:
  - Multi-device real-time sync across your phone, tablet, and computer.
  - Sign in with email or continue offline.
  - Stores data securely with Row Level Security (RLS).
  - Also works local-first using IndexedDB if you prefer not to connect cloud storage.
- **📦 Clusters (Grouping Zones)**:
  - Color-coded group boundaries that hold tasks, notes, and scratchpads together.
  - Drag a cluster to move all its cards at once.
  - Collapse / expand clusters to keep your workspace tidy.
  - Live completion stats (e.g., `4/6 tasks done`).
- **📝 Unstructured Card Types**:
  - **Interactive Todo Checklists**: Add items, press Enter to continue, strike-through, inline `#tag` extraction, priority flags (`high`, `med`, `low`), and celebratory confetti when you complete all tasks!
  - **Freeform Notes & Scratchpads**: Stream-of-consciousness typing, bullet points, and markdown notes.
  - **Sticky Notes**: High-contrast post-it notes with warm colors for quick reminders.
  - **Tally Counters**: One-tap increment/decrement counters for tracking daily counts, arrivals, or metrics.
  - **Bookmarks & Quick Links**: Save and 1-click launch key links, phone numbers, or portals.
- **🗂️ Multi-Document & Spaces Management**:
  - Switch between multiple independent spaces (e.g., *🏨 Hostel & Property Hub*, *🧠 Unstructured Life Scratchpad*, *🚀 Sprint Board*).
  - Create new spaces from pre-built starter templates or start blank.

---

## ⚡ Free Supabase 1-Step Setup

1. Create a free project at [supabase.com](https://supabase.com) (100% free tier forever).
2. Open the **SQL Editor** in your Supabase dashboard and run this single script:
```sql
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workspaces enable row level security;

create policy "Users can manage their own workspace" on public.workspaces
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```
3. In the Clustr app, tap the **Supabase** button in the header, paste your Project URL and Anon Public Key, and sign in!
*(Alternatively, you can add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your `.env` or Vercel environment variables).*

---

## 🚀 How to Host Entirely for Free ($0 Forever)

### Option 1: Vercel (Recommended - 60 Seconds)
1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your repository `MrNK2107/cluster` and click **Deploy**.
4. You get a live `https://cluster-xxx.vercel.app` URL with free SSL and worldwide CDN.

### Option 2: Cloudflare Pages
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages**.
2. Select your repository, set the build command to `npm run build` and output directory to `dist`.
3. Deploy for unlimited free bandwidth.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📄 License
MIT — Free to use, adapt, and host anywhere!

# Clustr ⚡ — Free Unstructured Spatial Todos & Clusters

> A spatial, unstructured to-do list & canvas app with multiple documents, clusters, and loose scratchpads. **100% free to host forever** with zero server costs, zero maintenance, and instant offline-ready performance.

---

## ✨ Features

- **Spatial Pinboard & Canvas**:
  - Infinite smooth pan & zoom canvas with custom dot grid.
  - Drag cards anywhere or group them visually.
  - Connect cards and clusters with curved relation arrows.
- **Clusters (Grouping Zones)**:
  - Color-coded group boundaries that hold tasks, notes, and scratchpads together.
  - Drag a cluster to move all its cards at once.
  - Collapse / expand clusters to keep your workspace tidy.
  - Live completion stats (e.g., `4/6 tasks done`).
- **Unstructured Card Types**:
  - **Interactive Todo Checklists**: Add items, press Enter to continue, strike-through, inline `#tag` extraction, priority flags (`high`, `med`, `low`), and celebratory confetti when you complete all tasks!
  - **Freeform Notes & Scratchpads**: Stream-of-consciousness typing, bullet points, and markdown notes.
  - **Sticky Notes**: High-contrast post-it notes with warm colors for quick reminders.
  - **Tally Counters**: One-tap increment/decrement counters for tracking daily counts, arrivals, or metrics.
  - **Bookmarks & Quick Links**: Save and 1-click launch key links, phone numbers, or portals.
- **Multi-Document & Spaces Management**:
  - Switch between multiple independent spaces (e.g., *🏨 Hostel & Property Hub*, *🧠 Unstructured Life Scratchpad*, *🚀 Sprint Board*).
  - Create new spaces from pre-built starter templates or start blank.
  - Duplicate, rename, or delete documents anytime.
- **Tag Filtering**:
  - Click any `#tag` (e.g. `#urgent`, `#frontdesk`, `#orders`) to filter the entire canvas in real time.
- **Data & 100% Free Sharing**:
  - **Local-First (Zero Cost)**: All data is saved instantly into your browser's local storage. Works completely offline.
  - **Serverless URL Snapshot**: Share an entire board via a single base64-encoded URL with zero database setup.
  - **Export as Markdown**: 1-click copy clean markdown todos and headers to paste into Notion, Slack, Obsidian, or WhatsApp.
  - **JSON Backup & Restore**: Download or restore your entire workspace anytime.

---

## 🚀 How to Host Entirely for Free ($0 Forever)

Because **Clustr** is built with a client-side local-first architecture:
1. **You never pay for a backend or database.** Each visitor gets their own workspace stored locally in their browser.
2. **You can host the app on any free static hosting provider forever.**

### Option 1: Vercel (Recommended - 60 Seconds)
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/clustr.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub (Free plan).
3. Click **"Add New Project"** and select your `clustr` repository.
4. Click **Deploy**. Your app is live with a free SSL certificate and custom domain!

### Option 2: Cloudflare Pages (100% Free with Unlimited Bandwidth)
1. Push your code to GitHub.
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repo.
4. Build command: `npm run build`, Build output directory: `dist`.
5. Click **Save and Deploy**.

### Option 3: GitHub Pages
1. Go to your repository on GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment**, select **Source: GitHub Actions**.
4. The included `.github/workflows/deploy.yml` workflow will automatically build and publish your app for free!

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

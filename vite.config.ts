import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Vercel ↔ Supabase integration sets SUPABASE_URL and the public keys
// without the VITE_ prefix, so Vite would not expose them. Map exactly those
// two public values onto the names the app reads. Never add the service-role
// or secret key here: everything defined below ends up in the browser bundle.
const integrationUrl = process.env.SUPABASE_URL?.trim()
const integrationKey = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim()
const supabaseFromIntegration =
  integrationUrl && integrationKey
    ? {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(integrationUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(integrationKey),
      }
    : {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: supabaseFromIntegration,
})

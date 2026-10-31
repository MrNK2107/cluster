import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Tests never reach the network: the Supabase SDK is mocked in every suite.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubEnvs: true,
    pool: 'threads',
    poolOptions: { threads: { maxThreads: 4 } },
  },
});

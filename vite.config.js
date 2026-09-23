import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vitest reuses the alias and plugin config above, so a test imports
  // '@/components/...' exactly as the app does.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    include: ['src/**/*.test.{js,jsx}'],
    // 15s rather than vitest's 5s default.
    //
    // These are userEvent-driven tests: every keystroke is a real event with
    // its own timers, and a form like the counter sale is driven through dozens
    // of them. Each file passes comfortably on its own — the failures only
    // appear when the whole suite runs in parallel, which is machine load
    // rather than slow assertions, and they move between files run to run.
    //
    // Raised once here instead of per test. Two files had already been patched
    // individually before it was clear this was a property of the suite, not of
    // those tests. The backend's jest.config.js carries the same reasoning.
    testTimeout: 15000,
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

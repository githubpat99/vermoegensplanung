import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite + React + Vitest configuration.
// `base: './'` keeps all asset paths relative so the build works on GitHub Pages
// (project pages served from a sub-path) without further configuration.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.{ts,tsx}'],
  },
});

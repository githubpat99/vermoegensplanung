import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite + React + Vitest configuration.
// `base: './'` keeps all asset paths relative so the build works on GitHub Pages
// (project pages served from a sub-path) without further configuration.
export default defineConfig({
  plugins: [react()],
  base: './',
  // Feste Ports: `vite` läuft immer auf 5173, `vite preview` immer auf 4173.
  // Ohne `strictPort` weicht Vite bei belegtem Port still auf 5174/4174 aus –
  // dann sucht man die App auf der falschen Adresse.
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: 'localhost',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.{ts,tsx}'],
  },
});

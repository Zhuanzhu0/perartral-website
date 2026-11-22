import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { port: 5178, host: '127.0.0.1' },
  preview: { port: 4178, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html') } },
  },
});

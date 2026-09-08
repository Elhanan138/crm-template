import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

// The ZIP exporter is a developer tool that lives in ./tools and is NOT part of
// an exported bundle. Loading it optionally means this file ships byte-identical
// to every deployment — there is no generated variant of the build config.
let exportZipPlugin = () => null;
try {
  ({ exportZipPlugin } = await import('./tools/export-zip.js'));
} catch {
  // Not present in an exported bundle — the app builds without it.
}

export default defineConfig({
  logLevel: 'error',
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  plugins: [react(), exportZipPlugin()],
});

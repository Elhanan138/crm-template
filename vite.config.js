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
    // 5173 by default, but a host that assigns a port gets to. Pinning it with
    // strictPort meant a second copy of the dev server simply refused to start,
    // and nothing here depends on the number: there is no OAuth callback, no
    // webhook, and the local data client makes no network calls at all.
    port: Number(process.env.PORT) || 5173,
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

// ─────────────────────────────────────────────────────────────────────────────
// Node adapter for the export engine. Reads the repo from disk and hands a
// virtual file map to tools/export-core.js — the same core the in-app button
// uses in the browser, so both paths produce identical archives.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { planExport } from './export-core.js';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

function listRepo(root, dir = '', out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) listRepo(root, rel, out);
    else out.push(rel);
  }
  return out;
}

/**
 * Plan an export from the working tree. Shared by the zip builder and the
 * GitHub publisher so both ship exactly the same files.
 */
export function planFromDisk(options = {}) {
  const root = options.root || process.cwd();
  const allPaths = listRepo(root);
  const pathSet = new Set(allPaths);
  const has = (p) => pathSet.has(p);
  const read = (p) => (pathSet.has(p) ? fs.readFileSync(path.join(root, p), 'utf-8') : null);
  return { root, ...planExport({ has, read, allPaths, options }) };
}

/** @returns {Promise<{ buffer: Buffer, meta: object }>} */
export async function buildExportZip(options = {}) {
  const { root, textFiles, copyPaths, meta } = planFromDisk(options);

  const zip = new JSZip();
  for (const [p, content] of textFiles) zip.file(p, content);
  for (const p of copyPaths) zip.file(p, fs.readFileSync(path.join(root, p)));

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buffer, meta };
}

/** Dev-server middleware — kept so the button also works over HTTP in dev. */
export function exportZipPlugin() {
  return {
    name: 'export-zip',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/export-zip', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const list = (key) => (url.searchParams.get(key) || '').split(',').filter(Boolean);
          const { buffer } = await buildExportZip({
            root: process.cwd(),
            modules: list('modules'),
            settingsSections: list('settingsSections'),
            devTools: url.searchParams.get('devTools') !== '0',
            blankTemplate: url.searchParams.get('blank') === '1',
            features: url.searchParams.has('features') ? list('features') : undefined,
          });
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', 'attachment; filename="app.zip"');
          res.end(buffer);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(err.message || String(err));
        }
      });
    },
  };
}

export default exportZipPlugin;

// ─────────────────────────────────────────────────────────────────────────────
// IN-APP EXPORT
//
// The whole repo is embedded at build time via import.meta.glob, so the export
// button works in the DEPLOYED app on Vercel/Netlify — no server, no API route,
// no access to a filesystem. The archive is assembled in the browser with JSZip.
//
// This module is loaded lazily (dynamic import from ExportDialog), so the source
// payload is a separate chunk that only downloads when someone actually exports.
//
// It reuses tools/export-core.js verbatim: the in-app button and `npm run export`
// run the same planner, the same validation and the same dependency pruning.
// ─────────────────────────────────────────────────────────────────────────────

import { planExport } from '../../tools/export-core.js';
// Vite excludes the file that owns an import.meta.glob from its own results,
// so this module has to add itself — otherwise the exported bundle would ship
// an ExportDialog importing a file that isn't there. The validator catches it.
import selfSource from '/src/lib/browserExport.js?raw';

const strip = (key) => (key.startsWith('/') ? key.slice(1) : key);

// Text sources — everything the planner may need to read or ship.
const textModules = {
  ...import.meta.glob('/src/**/*.{js,jsx,ts,tsx,css,json,md}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/tools/**/*.js', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/docs/**/*.md', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/*.{js,json,html,md,toml}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/public/**/*.{json,txt}', { query: '?raw', import: 'default', eager: true }),
};

// Binary assets keep their URLs; they are fetched at export time.
const assetUrls = import.meta.glob('/public/**/*.{png,jpg,jpeg,gif,webp,ico,svg,woff,woff2,ttf}', {
  query: '?url', import: 'default', eager: true,
});

const FILES = new Map();
for (const [key, content] of Object.entries(textModules)) FILES.set(strip(key), content);
FILES.set('src/lib/browserExport.js', selfSource);

const ASSETS = new Map();
for (const [key, url] of Object.entries(assetUrls)) ASSETS.set(strip(key), url);

// The build's own package-lock is stale the moment dependencies are pruned.
FILES.delete('package-lock.json');

const allPaths = [...FILES.keys(), ...ASSETS.keys()];
const has = (p) => FILES.has(p) || ASSETS.has(p);
const read = (p) => FILES.get(p) ?? null;

/** True when the source payload was embedded correctly at build time. */
export const canExport = () => FILES.has('src/lib/modules.js') && FILES.has('package.json');

/** Number of source files embedded in this build — used by tests and diagnostics. */
export const embeddedFileCount = () => allPaths.length;

/** Plan the export without building the archive. Exported for testing. */
export const planInBrowser = (options = {}) => planExport({ has, read, allPaths, options });

/**
 * Build the archive in the browser.
 * @returns {Promise<{ blob: Blob, meta: object }>}
 */
export async function buildZipInBrowser(options = {}) {
  const { textFiles, copyPaths, meta } = planExport({ has, read, allPaths, options });

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  for (const [p, content] of textFiles) zip.file(p, content);

  for (const p of copyPaths) {
    const url = ASSETS.get(p);
    if (!url) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`טעינת הנכס ${p} נכשלה`);
    zip.file(p, await res.arrayBuffer());
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return { blob, meta };
}

/**
 * Publish this build straight to a GitHub repository. Uses the same planner as
 * the ZIP, so what lands in the repo is byte-identical to what would download.
 */
export async function publishBundleToGitHub({ options = {}, repo, token, branch, message, onProgress }) {
  const { publishToGitHub } = await import('@/lib/github');
  const { textFiles, copyPaths, meta } = planExport({ has, read, allPaths, options });

  const binaryFiles = new Map();
  for (const p of copyPaths) {
    const url = ASSETS.get(p);
    if (!url) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`טעינת הנכס ${p} נכשלה`);
    binaryFiles.set(p, new Uint8Array(await res.arrayBuffer()));
  }

  const result = await publishToGitHub({
    repo, token, branch, onProgress, textFiles, binaryFiles,
    message: message || `Export: ${meta.modules.length} modules, ${meta.files} files`,
  });
  return { ...result, meta };
}

export function downloadBlob(blob, filename = 'app.zip') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

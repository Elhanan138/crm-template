import { lazy } from 'react';
import { MODULES, CORE_ROUTES, MODULE_IDS, WORKSPACES, WORKSPACE_IDS } from '@/lib/modules';

// Vite resolves this at BUILD time against the files that actually exist in the
// bundle. A module whose page files were left out of the ZIP simply drops out of
// the routes and the sidebar — no code generation, no dangling import, no crash.
const pageLoaders = import.meta.glob('/src/pages/*.jsx');

const loaderFor = (page) => pageLoaders[`/src/pages/${page}.jsx`];

export const hasPage = (page) => Boolean(loaderFor(page));

// `meta` carries the module and workspace a route belongs to, so the router can
// enforce the capability switches instead of only the sidebar hiding the link.
function buildRoutes(defs, meta = {}) {
  return defs
    .filter((r) => hasPage(r.page))
    .map((r) => ({ path: r.path, page: r.page, Component: lazy(loaderFor(r.page)), ...meta }));
}

/** Module ids whose pages are all present in this build. */
export const ACTIVE_MODULE_IDS = MODULE_IDS.filter((id) =>
  MODULES[id].routes.some((r) => hasPage(r.page))
);

export const MODULE_ROUTES = ACTIVE_MODULE_IDS.flatMap((id) =>
  buildRoutes(MODULES[id].routes, { moduleId: id, workspaceId: MODULES[id].parent || null })
);

export const CORE_APP_ROUTES = buildRoutes(CORE_ROUTES);

export const ALL_ROUTES = [...MODULE_ROUTES, ...CORE_APP_ROUTES];

export const FirstTimeSetupComponent = hasPage('FirstTimeSetup')
  ? lazy(loaderFor('FirstTimeSetup'))
  : null;

// ── Workspaces ───────────────────────────────────────────────────────────────
// Derived from the same manifest as everything else. A workspace exists only if
// at least one of its modules is in this build, so a partial export never shows
// an empty destination.

const childrenOf = (workspaceId) =>
  ACTIVE_MODULE_IDS.filter((id) => MODULES[id].parent === workspaceId && MODULES[id].label);

export const ACTIVE_WORKSPACES = WORKSPACE_IDS
  .map((id) => ({ id, ...WORKSPACES[id], children: childrenOf(id) }))
  .filter((w) => w.children.length > 0);

/** Modules that stand on their own in the sidebar (no parent workspace). */
export const STANDALONE_MODULE_IDS = ACTIVE_MODULE_IDS.filter(
  (id) => !MODULES[id].parent && MODULES[id].label
);

/** All paths that belong to a workspace, longest first so /accounts/:id matches. */
const pathsOf = (workspace) =>
  workspace.children
    .flatMap((id) => MODULES[id].routes.map((r) => r.path))
    .sort((a, b) => b.length - a.length);

/** Which workspace a pathname belongs to, or null. */
export function workspaceForPath(pathname) {
  for (const workspace of ACTIVE_WORKSPACES) {
    for (const path of pathsOf(workspace)) {
      const base = path.split('/:')[0];
      if (base !== '/' && (pathname === base || pathname.startsWith(`${base}/`))) return workspace;
    }
  }
  return null;
}

// ── Route prefetching ────────────────────────────────────────────────────────
// Every page is a lazy chunk, so the first visit to a route used to blank the
// screen while the chunk downloaded. Warming the loaders removes that stall:
// on idle after boot, and eagerly when a nav link is hovered or focused.

const loaderByPath = new Map();
for (const [id, mod] of Object.entries(MODULES)) {
  for (const route of mod.routes) {
    const loader = loaderFor(route.page);
    if (loader) loaderByPath.set(route.path.split('/:')[0], loader);
  }
  void id;
}
for (const route of CORE_ROUTES) {
  const loader = loaderFor(route.page);
  if (loader) loaderByPath.set(route.path, loader);
}

const warmed = new Set();
const warm = (loader, key) => {
  if (!loader || warmed.has(key)) return;
  warmed.add(key);
  loader().catch(() => warmed.delete(key));
};

/** Preload the chunk behind a nav path. Safe to call repeatedly. */
export function prefetchPath(path) {
  const base = String(path || '').split('/:')[0];
  warm(loaderByPath.get(base), base);
}

/** Preload every route, quietly, once the app is idle. */
export function prefetchAllRoutes() {
  for (const [key, loader] of loaderByPath) warm(loader, key);
}

/** Which module a pathname belongs to, for highlighting the active tab. */
export function moduleForPath(pathname) {
  const candidates = ACTIVE_MODULE_IDS
    .flatMap((id) => MODULES[id].routes.map((r) => ({ id, base: r.path.split('/:')[0] })))
    .sort((a, b) => b.base.length - a.base.length);
  return candidates.find(
    (c) => c.base !== '/' && (pathname === c.base || pathname.startsWith(`${c.base}/`))
  )?.id || null;
}

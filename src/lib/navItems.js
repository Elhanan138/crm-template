import { NAV_ICONS } from '@/lib/navIcons';
import { MODULES } from '@/lib/modules';
import { ACTIVE_WORKSPACES, STANDALONE_MODULE_IDS } from '@/lib/moduleRegistry';

// The sidebar lists DESTINATIONS, not modules: one entry per workspace, plus any
// module that has no parent. Everything is derived from the manifest, so a module
// can neither leave an orphan link nor go missing from navigation.
//
// A workspace links to its first available module, and stays highlighted for any
// path inside it. Its modules are the indented list under it in the sidebar —
// that IS the second level, and it is the only one. A tab strip inside the page
// would say the same thing twice.

const workspaceItems = ACTIVE_WORKSPACES.map((w) => ({
  label: w.label,
  path: MODULES[w.children[0]].navPath,
  icon: NAV_ICONS[w.icon],
  group: w.group || 'core',
  workspace: w.id,
  featureKey: `workspace:${w.id}`,
  matchPaths: w.children.flatMap((id) => MODULES[id].routes.map((r) => r.path.split('/:')[0])),
  // Rendered as an indented list under the parent. A workspace with one module
  // has no children to show — it behaves as an ordinary link.
  children: w.children.length > 1
    ? w.children.map((id) => ({
        id,
        label: MODULES[id].label,
        path: MODULES[id].navPath,
        featureKey: `module:${id}`,
        matchPaths: MODULES[id].routes.map((r) => r.path.split('/:')[0]),
      }))
    : [],
}));

const standaloneItems = STANDALONE_MODULE_IDS.map((id) => ({
  label: MODULES[id].label,
  path: MODULES[id].navPath,
  icon: NAV_ICONS[MODULES[id].icon],
  group: MODULES[id].group || 'core',
  featureKey: `module:${id}`,
}));

// Dashboard first, then workspaces, then anything else standalone.
export const NAV_ITEMS = [
  ...standaloneItems.filter((i) => i.path === '/'),
  ...workspaceItems,
  ...standaloneItems.filter((i) => i.path !== '/'),
];

import { MODULES } from '@/lib/modules';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// STARTER PACKAGES
//
// docs/VALUE-MAP.md says it plainly: the first four stages of the route are a
// complete product, and five and six are what justify the word "system".
// Twenty-five modules on day one is a catalogue, not a product — so the wizard
// asks one question ("what do you do") and turns the rest off.
//
// Nothing here touches the manifest at run time. A package is expressed as the
// set of modules to LEAVE OPEN; everything else is closed through the ordinary
// global_system_features switchboard, exactly as an administrator would.
// ─────────────────────────────────────────────────────────────────────────────

/** Always available, whatever package is chosen. */
const ALWAYS_ON = ['dashboard', 'settings', 'support', 'reports'];

export const PACKAGES = [
  {
    id: 'sell',
    label: 'למכור',
    description: 'צנרת מכירות מהפנייה ועד הסגירה',
    modules: ['leads', 'contacts', 'proposals'],
  },
  {
    id: 'deliver',
    label: 'לספק',
    description: 'ומה שנמכר גם מסופק — פרויקטים ומשימות',
    modules: ['leads', 'contacts', 'proposals', 'projects', 'tasks', 'calendar'],
  },
  {
    id: 'collect',
    label: 'לגבות',
    description: 'ורווחיות אמיתית לכל עסקה — חשבוניות ומחירון',
    modules: ['leads', 'contacts', 'proposals', 'projects', 'tasks', 'calendar', 'invoices', 'products'],
  },
  {
    id: 'control',
    label: 'לשלוט',
    description: 'הכנסה חוזרת, תחזית, סיכונים ואוטומציות',
    modules: [
      'leads', 'contacts', 'proposals', 'projects', 'tasks', 'calendar',
      'invoices', 'products', 'subscriptions', 'forecast', 'risks', 'automations',
    ],
  },
];

export const packageById = (id) => PACKAGES.find((p) => p.id === id) || null;

/** The modules a package opens, limited to those this build actually contains. */
export const modulesOf = (pkg) =>
  [...new Set([...ALWAYS_ON, ...(pkg?.modules || [])])].filter((id) => ACTIVE_MODULE_IDS.includes(id));

/**
 * The capability values that express a package: every module NOT in it is
 * closed. Written through the same setting an administrator edits by hand, so
 * the choice can be undone in one screen and nothing is special-cased.
 */
export function capabilityValuesFor(pkg) {
  const keep = new Set(modulesOf(pkg));
  const values = {};
  for (const id of ACTIVE_MODULE_IDS) {
    if (!MODULES[id]?.label) continue;
    values[`module:${id}`] = keep.has(id) ? 'all' : 'closed';
  }
  // A workspace with nothing open would still show as an empty destination.
  for (const id of ACTIVE_MODULE_IDS) {
    const workspace = MODULES[id]?.parent;
    if (!workspace) continue;
    const anyOpen = ACTIVE_MODULE_IDS.some((m) => MODULES[m]?.parent === workspace && keep.has(m));
    values[`workspace:${workspace}`] = anyOpen ? 'all' : 'closed';
  }
  return values;
}

/** How many of a package's modules this build can actually offer. */
export const coverageOf = (pkg) => {
  const wanted = (pkg?.modules || []).filter((id) => MODULES[id]);
  const have = wanted.filter((id) => ACTIVE_MODULE_IDS.includes(id));
  return { have: have.length, wanted: wanted.length };
};

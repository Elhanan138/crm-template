import { Plus, Settings as SettingsIcon } from 'lucide-react';
import { MODULES } from '@/lib/modules';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS
//
// Ctrl+K on an empty system used to show nothing at all. The most useful thing
// a search box can offer someone who has not typed yet is the handful of things
// they were probably about to create.
//
// Derived, like everything else: an action exists for a module only if that
// module is in this build, so a bundle without invoices never offers to create
// one. `?new=1` is the same door the page's own button opens — no second path
// into the form.
// ─────────────────────────────────────────────────────────────────────────────

/** Modules worth offering a "create" shortcut for, in the order they matter. */
const CREATE_ORDER = ['tasks', 'leads', 'proposals', 'invoices', 'contacts', 'projects'];

const labelFor = (id) =>
  CRM_SCHEMAS[id]?.singular || MODULES[id]?.label || id;

export function quickActionsFor({ t = (x) => x } = {}) {
  const actions = CREATE_ORDER
    .filter((id) => ACTIVE_MODULE_IDS.includes(id) && MODULES[id]?.navPath)
    .map((id) => ({
      id: `create:${id}`,
      icon: Plus,
      label: `${t('חדש')} — ${t(labelFor(id))}`,
      path: `${MODULES[id].navPath}${id === 'projects' ? '/new' : '?new=1'}`,
    }));

  if (ACTIVE_MODULE_IDS.includes('settings')) {
    actions.push({
      id: 'goto:settings',
      icon: SettingsIcon,
      label: t('מעבר להגדרות'),
      path: MODULES.settings.navPath,
    });
  }
  return actions;
}

/** Does a query look like it is reaching for an action rather than a record? */
export const matchesAction = (action, query) =>
  !query || action.label.toLowerCase().includes(String(query).toLowerCase());

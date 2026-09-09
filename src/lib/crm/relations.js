import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';
import { accountKey } from '@/lib/crm/accountKey';

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
//
// The connective tissue between modules. Deliberately NOT a merged mega-form:
// a record keeps its own fields, and everything related to it is shown as a
// compact strip of links. You see that a lead has three invoices; you go there
// to read them.
//
// Every relation matches on a value that already exists in both records, so
// nothing new has to be filled in for the link to work.
//
// THREE MATCH MODES
//   'account' – customer identity, compared through accountKey(). This is the
//               default for every customer-name link: the same customer is
//               stored as `company`, `client_name` and `customer` depending on
//               the module, and raw string equality loses the link to a comma.
//   'exact'   – case-insensitive equality on a value that is already canonical
//               (a person's name from the directory, a supplier, a site).
//   'id'      – a record id against a foreign key. Never fuzzy.
// ─────────────────────────────────────────────────────────────────────────────

// Modules that carry records but are not schema-driven. They take part in the
// graph on the same terms as everything else; only their entity name has to be
// stated here, because there is no schema to read it from.
const NON_SCHEMA_ENTITIES = {
  projects: 'Project',
  tasks: 'Task',
};

export const RELATIONS = [
  // ── Revenue journey — lead → proposal → invoice → subscription ────────────
  { from: 'leads', fromField: 'company', to: 'contacts', toField: 'company', label: 'אנשי קשר', match: 'account' },
  { from: 'leads', fromField: 'company', to: 'invoices', toField: 'client_name', label: 'חשבוניות', match: 'account' },
  { from: 'leads', fromField: 'company', to: 'subscriptions', toField: 'customer', label: 'מנויים', match: 'account' },

  { from: 'contacts', fromField: 'company', to: 'leads', toField: 'company', label: 'הזדמנויות', match: 'account' },
  { from: 'contacts', fromField: 'company', to: 'invoices', toField: 'client_name', label: 'חשבוניות', match: 'account' },

  { from: 'invoices', fromField: 'client_name', to: 'leads', toField: 'company', label: 'הזדמנויות', match: 'account' },
  { from: 'invoices', fromField: 'client_name', to: 'subscriptions', toField: 'customer', label: 'מנויים', match: 'account' },
  { from: 'invoices', fromField: 'client_name', to: 'contacts', toField: 'company', label: 'אנשי קשר', match: 'account' },

  { from: 'subscriptions', fromField: 'customer', to: 'invoices', toField: 'client_name', label: 'חשבוניות', match: 'account' },
  { from: 'subscriptions', fromField: 'customer', to: 'leads', toField: 'company', label: 'הזדמנויות', match: 'account' },

  // ── Sell → deliver — the half of the graph that used to be missing ────────
  // Without these, "did we deliver what we sold, and what did it cost us" has
  // no answer anywhere in the system: the CRM side and the delivery side each
  // knew the customer by a different field name and never met.
  { from: 'leads', fromField: 'company', to: 'projects', toField: 'client_name', label: 'פרויקטים', match: 'account' },
  { from: 'contacts', fromField: 'company', to: 'projects', toField: 'client_name', label: 'פרויקטים', match: 'account' },
  { from: 'invoices', fromField: 'client_name', to: 'projects', toField: 'client_name', label: 'פרויקטים', match: 'account' },
  { from: 'subscriptions', fromField: 'customer', to: 'projects', toField: 'client_name', label: 'פרויקטים', match: 'account' },

  { from: 'projects', fromField: 'client_name', to: 'leads', toField: 'company', label: 'הזדמנויות', match: 'account' },
  { from: 'projects', fromField: 'client_name', to: 'contacts', toField: 'company', label: 'אנשי קשר', match: 'account' },
  { from: 'projects', fromField: 'client_name', to: 'invoices', toField: 'client_name', label: 'חשבוניות', match: 'account' },
  { from: 'projects', fromField: 'client_name', to: 'subscriptions', toField: 'customer', label: 'מנויים', match: 'account' },
  { from: 'projects', fromField: 'id', to: 'tasks', toField: 'project_id', label: 'משימות', match: 'id' },
  { from: 'tasks', fromField: 'project_id', to: 'projects', toField: 'id', label: 'פרויקט', match: 'id' },

  // ── Delivery → cost — who carries the work ───────────────────────────────
  { from: 'employees', fromField: 'full_name', to: 'projects', toField: 'project_manager', label: 'פרויקטים בניהולו', match: 'exact' },
  { from: 'employees', fromField: 'full_name', to: 'tasks', toField: 'assigned_to', label: 'משימות', match: 'exact' },

  // ── Service loop — asset → work orders → stock ───────────────────────────
  { from: 'assets', fromField: 'name', to: 'maintenance', toField: 'site', label: 'קריאות שירות', match: 'exact' },
  { from: 'maintenance', fromField: 'site', to: 'assets', toField: 'name', label: 'נכסים', match: 'exact' },
  { from: 'inventory', fromField: 'supplier', to: 'purchasing', toField: 'supplier', label: 'הזמנות רכש', match: 'account' },
  { from: 'purchasing', fromField: 'supplier', to: 'inventory', toField: 'supplier', label: 'פריטי מלאי', match: 'account' },

  // ── People — employee → assets, training, work orders ────────────────────
  { from: 'employees', fromField: 'full_name', to: 'assets', toField: 'assigned_to', label: 'ציוד', match: 'exact' },
  { from: 'employees', fromField: 'full_name', to: 'training', toField: 'participant', label: 'הכשרות', match: 'exact' },
  { from: 'employees', fromField: 'full_name', to: 'maintenance', toField: 'technician', label: 'קריאות', match: 'exact' },
  { from: 'recruiting', fromField: 'full_name', to: 'employees', toField: 'full_name', label: 'תיק עובד', match: 'exact' },
  { from: 'training', fromField: 'participant', to: 'employees', toField: 'full_name', label: 'תיק עובד', match: 'exact' },

  // ── Governance — a control and the risks around it share a category ──────
  { from: 'compliance', fromField: 'framework', to: 'risks', toField: 'category', label: 'סיכונים', match: 'exact' },
  { from: 'risks', fromField: 'category', to: 'compliance', toField: 'framework', label: 'בקרות', match: 'exact' },
];

/** The entity behind a module, whether or not it is schema-driven. */
export const entityForModule = (moduleId) =>
  CRM_SCHEMAS[moduleId]?.entity || NON_SCHEMA_ENTITIES[moduleId] || null;

/** Can this build express relations to that module at all? */
const moduleIsLinkable = (moduleId) =>
  ACTIVE_MODULE_IDS.includes(moduleId) && !!entityForModule(moduleId);

const normalize = (mode, value) =>
  mode === 'account' ? accountKey(value) : String(value ?? '').trim().toLowerCase();

/**
 * Relations available for a record: only those whose target module is in this
 * build, and only when the record actually carries the linking value.
 */
export function relationsFor(moduleId, record) {
  if (!record) return [];
  return RELATIONS.filter((rel) => {
    if (rel.from !== moduleId) return false;
    if (!moduleIsLinkable(rel.to)) return false;
    const value = record[rel.fromField];
    if (value === undefined || value === null || String(value).trim() === '') return false;
    // An account link on an unrecognizable name is not a link.
    return rel.match !== 'account' || accountKey(value) !== '';
  }).map((rel) => {
    const value = String(record[rel.fromField]).trim();
    const navPath = MODULES[rel.to]?.navPath;
    return {
      ...rel,
      value,
      entity: entityForModule(rel.to),
      // A human-readable link value is carried over as a search term, so the
      // link lands on the filtered list instead of on the whole module. An id
      // means nothing in a search box, so it is not passed.
      path: rel.match === 'id' || !navPath ? navPath : `${navPath}?q=${encodeURIComponent(value)}`,
    };
  });
}

/** Match on the linking field, under the relation's own comparison rules. */
export const matchesRelation = (rel) => {
  const target = normalize(rel.match, rel.value);
  if (!target) return () => false;
  return (candidate) => normalize(rel.match, candidate?.[rel.toField]) === target;
};

/** Relations this build can actually express — used by tests and diagnostics. */
export const activeRelations = () =>
  RELATIONS.filter((r) => moduleIsLinkable(r.from) && moduleIsLinkable(r.to));

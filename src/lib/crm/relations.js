import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';

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
// ─────────────────────────────────────────────────────────────────────────────

export const RELATIONS = [
  // Revenue journey — lead → proposal → invoice → subscription
  { from: 'leads', fromField: 'company', to: 'contacts', toField: 'company', label: 'אנשי קשר' },
  { from: 'leads', fromField: 'company', to: 'invoices', toField: 'client_name', label: 'חשבוניות' },
  { from: 'leads', fromField: 'company', to: 'subscriptions', toField: 'customer', label: 'מנויים' },

  { from: 'contacts', fromField: 'company', to: 'leads', toField: 'company', label: 'הזדמנויות' },
  { from: 'contacts', fromField: 'company', to: 'invoices', toField: 'client_name', label: 'חשבוניות' },

  { from: 'invoices', fromField: 'client_name', to: 'leads', toField: 'company', label: 'הזדמנויות' },
  { from: 'invoices', fromField: 'client_name', to: 'subscriptions', toField: 'customer', label: 'מנויים' },
  { from: 'invoices', fromField: 'client_name', to: 'contacts', toField: 'company', label: 'אנשי קשר' },

  { from: 'subscriptions', fromField: 'customer', to: 'invoices', toField: 'client_name', label: 'חשבוניות' },
  { from: 'subscriptions', fromField: 'customer', to: 'leads', toField: 'company', label: 'הזדמנויות' },

  // Service loop — asset → work orders → stock
  { from: 'assets', fromField: 'name', to: 'maintenance', toField: 'site', label: 'קריאות שירות' },
  { from: 'maintenance', fromField: 'site', to: 'assets', toField: 'name', label: 'נכסים' },
  { from: 'inventory', fromField: 'supplier', to: 'purchasing', toField: 'supplier', label: 'הזמנות רכש' },
  { from: 'purchasing', fromField: 'supplier', to: 'inventory', toField: 'supplier', label: 'פריטי מלאי' },

  // People — employee → assets, training, work orders
  { from: 'employees', fromField: 'full_name', to: 'assets', toField: 'assigned_to', label: 'ציוד' },
  { from: 'employees', fromField: 'full_name', to: 'training', toField: 'participant', label: 'הכשרות' },
  { from: 'employees', fromField: 'full_name', to: 'maintenance', toField: 'technician', label: 'קריאות' },
  { from: 'recruiting', fromField: 'full_name', to: 'employees', toField: 'full_name', label: 'תיק עובד' },
  { from: 'training', fromField: 'participant', to: 'employees', toField: 'full_name', label: 'תיק עובד' },

  // Governance — a control and the risks around it share a category
  { from: 'compliance', fromField: 'framework', to: 'risks', toField: 'category', label: 'סיכונים' },
  { from: 'risks', fromField: 'category', to: 'compliance', toField: 'framework', label: 'בקרות' },
];

/**
 * Relations available for a record: only those whose target module is in this
 * build, and only when the record actually carries the linking value.
 */
export function relationsFor(moduleId, record) {
  if (!record) return [];
  return RELATIONS.filter((rel) => {
    if (rel.from !== moduleId) return false;
    if (!ACTIVE_MODULE_IDS.includes(rel.to)) return false;
    if (!CRM_SCHEMAS[rel.to]) return false;
    const value = record[rel.fromField];
    return value !== undefined && value !== null && String(value).trim() !== '';
  }).map((rel) => ({
    ...rel,
    value: String(record[rel.fromField]).trim(),
    entity: CRM_SCHEMAS[rel.to].entity,
    path: MODULES[rel.to]?.navPath,
  }));
}

/** Case-insensitive match on the linking field. */
export const matchesRelation = (rel) => (candidate) =>
  String(candidate?.[rel.toField] ?? '').trim().toLowerCase() === rel.value.toLowerCase();

/** Relations this build can actually express — used by tests and diagnostics. */
export const activeRelations = () =>
  RELATIONS.filter((r) => ACTIVE_MODULE_IDS.includes(r.from) && ACTIVE_MODULE_IDS.includes(r.to));

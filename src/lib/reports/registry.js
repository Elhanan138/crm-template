import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { MODULES } from '@/lib/modules';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { NAV_ICONS } from '@/lib/navIcons';
import { DATA_SOURCES as LEGACY_SOURCES } from '@/components/reports/dataSources';

// ─────────────────────────────────────────────────────────────────────────────
// REPORT REGISTRY
//
// Report sources are DERIVED, never hand-listed. Every schema-driven module
// reports on itself, with columns, groupings and aggregations inferred from the
// same field declarations that drive its list and its form.
//
// Two consequences that matter:
//   • adding a module adds its report — nothing to remember
//   • a partial export ships only the reports for the modules it contains, and
//     only the relations that still resolve inside that bundle
// ─────────────────────────────────────────────────────────────────────────────

// A field type decides how the column renders and what can be done with it.
const COLUMN_RULES = {
  select:   { type: 'badge',    groupable: true },
  person:   { type: 'text',     groupable: true },
  checkbox: { type: 'badge',    groupable: true },
  currency: { type: 'currency', aggregatable: true },
  number:   { type: 'number',   aggregatable: true },
  percent:  { type: 'number',   aggregatable: true },
  date:     { type: 'date' },
  relation: { type: 'text',     groupable: true },
  text:     { type: 'text' },
  textarea: { type: 'text' },
  email:    { type: 'text' },
  phone:    { type: 'text' },
  url:      { type: 'text' },
};

// Short free-text fields are worth grouping by; long ones are not.
const GROUPABLE_TEXT_KEYS = /(^|_)(category|type|status|stage|source|department|role|unit|framework|company|supplier|site|plan|location|industry|size|cost_center|position)($|_)/;

const columnFor = (field) => {
  const rule = COLUMN_RULES[field.type] || COLUMN_RULES.text;
  return {
    key: field.key,
    label: field.label,
    ...rule,
    groupable: rule.groupable || (field.type === 'text' && GROUPABLE_TEXT_KEYS.test(field.key)),
  };
};

/** Report source for one schema-driven module. */
/**
 * Columns for the custom fields an administrator generated for an entity.
 *
 * They are read from the same COLUMN_RULES as declared fields, so a custom
 * `select` groups and a custom `number` totals exactly like a built-in one.
 * The key is prefixed because the values live in a `custom_fields` object.
 */
export function customFieldColumns(entity, customFields = []) {
  return customFields
    .filter((f) => f.entity === entity && f.type !== 'textarea')
    .map((f) => ({
      ...columnFor({ key: `custom_fields.${f.key}`, label: f.label, type: f.type }),
      custom: true,
    }));
}

function sourceFromSchema(moduleId, schema) {
  const columns = schema.fields
    .filter((f) => f.type !== 'textarea')
    .map(columnFor);

  // A record tied to a project gains the project's name as a grouping column,
  // but only when the projects module is part of this build.
  if (
    ACTIVE_MODULE_IDS.includes('projects') &&
    schema.fields.some((f) => f.key === 'project_id')
  ) {
    columns.splice(1, 0, { key: 'project_name', label: 'פרויקט', type: 'text', groupable: true, derived: true });
  }

  return {
    id: moduleId,
    module: moduleId,
    entity: schema.entity,
    label: schema.title,
    icon: NAV_ICONS[MODULES[moduleId]?.icon] || schema.icon,
    workspace: MODULES[moduleId]?.parent || null,
    columns,
  };
}

/** Every report available in this build, in sidebar order. */
export function buildReportSources() {
  const fromModules = ACTIVE_MODULE_IDS
    .filter((id) => CRM_SCHEMAS[id])
    .map((id) => sourceFromSchema(id, CRM_SCHEMAS[id]));

  // Hand-written sources survive for entities that predate the schema engine.
  // Each declares which module it belongs to so it drops out with that module.
  const legacyModuleOf = {
    projects: 'projects', tasks: 'tasks', quotes: 'proposals',
    tickets: 'support', errors: null,
  };
  const fromLegacy = LEGACY_SOURCES
    .filter((s) => {
      const module = legacyModuleOf[s.id];
      return module === null || ACTIVE_MODULE_IDS.includes(module);
    })
    .map((s) => ({ ...s, module: legacyModuleOf[s.id], workspace: MODULES[legacyModuleOf[s.id]]?.parent || null }));

  // Legacy definitions win on id: they carry hand-tuned columns.
  const seen = new Set(fromLegacy.map((s) => s.id));
  return [...fromLegacy, ...fromModules.filter((s) => !seen.has(s.id))];
}

/** Which entity each report reads, so the page can fetch exactly what it shows. */
export const entityOf = (source) =>
  source.entity || {
    projects: 'Project', tasks: 'Task', quotes: 'Quote',
    tickets: 'SupportTicket', errors: 'ErrorLog',
  }[source.id];

/** Numeric columns, for the cross-module summary. */
export const aggregatableColumns = (source) => source.columns.filter((c) => c.aggregatable);

export const WORKSPACE_ORDER = ['sales', 'delivery', 'finance', 'people', 'supply', 'governance', 'operations'];

/** Sources grouped for display, empty groups removed. */
export function groupSources(sources) {
  const groups = new Map();
  for (const source of sources) {
    const key = source.workspace || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(source);
  }
  const ordered = [...WORKSPACE_ORDER, 'other'].filter((k) => groups.has(k));
  return ordered.map((key) => ({ key, sources: groups.get(key) }));
}

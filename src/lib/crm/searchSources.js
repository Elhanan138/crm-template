import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';
import { NAV_ICONS } from '@/lib/navIcons';

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH SOURCES
//
// Global search used to know six hand-listed record types, all of them from the
// project side of the system. Fifteen schema-driven modules — every lead, every
// invoice, every asset — could not be found from the search box at all.
//
// Nothing about a module needs to be repeated here: it already declares
// `searchFields`, `titleField` and its own title and icon. Deriving the sources
// means a module added later is searchable the moment it is declared, and a
// partial export searches exactly the modules it shipped with.
// ─────────────────────────────────────────────────────────────────────────────

/** The field that best describes a record under its title, if any. */
const subtitleFieldOf = (schema) =>
  (schema.searchFields || []).find((key) => key !== schema.titleField) || null;

export const CRM_SEARCH_SOURCES = ACTIVE_MODULE_IDS
  .filter((id) => CRM_SCHEMAS[id] && (CRM_SCHEMAS[id].searchFields || []).length > 0)
  .map((id) => {
    const schema = CRM_SCHEMAS[id];
    return {
      type: `crm:${id}`,
      moduleId: id,
      entity: schema.entity,
      label: schema.singular || schema.title,
      icon: NAV_ICONS[MODULES[id].icon],
      path: MODULES[id].navPath,
      titleField: schema.titleField,
      subtitleField: subtitleFieldOf(schema),
      searchFields: schema.searchFields,
    };
  });

export const sourceForType = (type) => CRM_SEARCH_SOURCES.find((s) => s.type === type) || null;

/** The strings a record offers to the matcher: its title first, then the rest. */
export function searchTextsOf(source, record) {
  const primary = record?.[source.titleField];
  const secondary = source.searchFields
    .filter((key) => key !== source.titleField)
    .map((key) => record?.[key])
    .filter((v) => v !== undefined && v !== null && v !== '');
  return { primary, secondary };
}

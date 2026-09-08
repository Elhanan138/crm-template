import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';
import { NAV_ICONS } from '@/lib/navIcons';
import { docToPlainText } from '@/lib/notionDoc';

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
      // Long-form fields are searched too. A note written into a record is
      // exactly the kind of thing someone later remembers a phrase from and
      // cannot otherwise find.
      bodyFields: (schema.fields || []).filter((f) => f.type === 'textarea').map((f) => f.key),
    };
  });

export const sourceForType = (type) => CRM_SEARCH_SOURCES.find((s) => s.type === type) || null;

/**
 * The strings a record offers to the matcher: its title first, then the rest.
 *
 * The title stays the only PRIMARY text, which is what keeps the existing
 * scoring honest — a hit in a title always outranks a hit in a body, however
 * long the body is.
 */
export function searchTextsOf(source, record) {
  const primary = record?.[source.titleField];
  const keys = [...new Set([...(source.searchFields || []), ...(source.bodyFields || [])])];
  const secondary = keys
    .filter((key) => key !== source.titleField)
    .map((key) => record?.[key])
    .filter((v) => v !== undefined && v !== null && v !== '');
  return { primary, secondary };
}

/**
 * A rich-text document flattened to searchable text.
 *
 * Notes hold a ProseMirror document, not a string; without this, a phrase that
 * exists only in the body of a page could not be found at all. Flattening the
 * stored document is cheap next to fetching it, and it happens per query rather
 * than per keystroke because the records are already in the query cache.
 */
export function docText(doc) {
  try { return docToPlainText(doc) || ''; } catch { return ''; }
}

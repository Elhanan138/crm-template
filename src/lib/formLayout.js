import { sortFields, formFieldsOf } from '@/lib/customFields';

// ─────────────────────────────────────────────────────────────────────────────
// FORM LAYOUT
//
// The order of a form is a decision about how the work reads, and it belongs to
// whoever runs the deployment — not to whoever wrote the schema. Every field is
// movable: built-in and custom alike, in one list, in any order.
//
// What is stored is a single ordered list of keys per entity. It is a
// PREFERENCE, never the definition: the schema still says what a record is and
// which fields exist. That separation is what makes this safe across upgrades —
// a key that disappears from the schema is skipped, and a field added in a later
// version appears in its natural place instead of vanishing because an old
// stored order never mentioned it.
// ─────────────────────────────────────────────────────────────────────────────

export const LAYOUT_ENTITY = 'FormLayout';

/**
 * The form, in the order it should be rendered.
 *
 * @param {string} entity        the record type
 * @param {Array}  customFields  the admin-defined fields for it
 * @param {Array}  order         stored key order; anything missing keeps its place
 * @returns {Array<{ key, kind: 'builtin'|'custom', field }>}
 */
export function resolveLayout(entity, customFields = [], order = []) {
  const builtin = formFieldsOf(entity).map((field) => ({ key: field.key, kind: 'builtin', field }));
  const custom = sortFields(customFields)
    .filter((f) => !f.hidden)
    .map((field) => ({ key: field.key, kind: 'custom', field }));

  // The natural order: the form as written, then the custom fields after it.
  // This is what a deployment that has never touched the layout sees, which is
  // exactly what it saw before there was a layout at all.
  const natural = [...builtin, ...custom];
  const byKey = new Map(natural.map((item) => [item.key, item]));

  const out = [];
  const placed = new Set();
  for (const key of order || []) {
    const item = byKey.get(key);
    // A stored key for a field that no longer exists is skipped, not mourned.
    if (item && !placed.has(key)) { out.push(item); placed.add(key); }
  }

  // Anything the stored order never mentioned goes after it, in natural order.
  // Reordering writes the whole list, so this only ever catches fields that did
  // not exist when the order was saved — a custom field just created, or a
  // built-in one added by an upgrade. The end is where they can be seen and
  // moved; guessing a position in the middle would silently rearrange a form
  // somebody had already arranged.
  for (const item of natural) if (!placed.has(item.key)) out.push(item);
  return out;
}

/**
 * Move one key to a gap in the list.
 *
 * `gapIndex` is a position BETWEEN items in the list as it is currently shown:
 * 0 is above everything, `items.length` is below everything.
 *
 * @returns {string[]} the new key order, ready to store
 */
export function moveInLayout(items, key, gapIndex) {
  const keys = items.map((item) => (typeof item === 'string' ? item : item.key));
  const from = keys.indexOf(key);
  if (from < 0) return keys;

  const target = Math.max(0, Math.min(Number(gapIndex) || 0, keys.length));
  // Removing the field first shifts every gap below it up by one.
  const at = target > from ? target - 1 : target;

  const next = [...keys];
  next.splice(from, 1);
  next.splice(at, 0, key);
  return next;
}

/** True when the stored order says something the natural order does not. */
export const isCustomised = (entity, customFields, order) => {
  if (!order?.length) return false;
  const natural = resolveLayout(entity, customFields, []).map((i) => i.key);
  const current = resolveLayout(entity, customFields, order).map((i) => i.key);
  return natural.join('|') !== current.join('|');
};

/** The stored order for an entity, out of however many layout records exist. */
export const orderFor = (layouts, entity) =>
  (layouts || []).find((l) => l.entity === entity)?.order || [];

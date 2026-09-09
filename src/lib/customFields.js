import {
  Type, AlignLeft, Hash, Calendar, ChevronDown, ToggleLeft, Link2, Mail, Phone, User,
} from 'lucide-react';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { CONDITION_OPERATORS } from '@/lib/crm/schemas';

// Field types an administrator can generate. Adding a type here makes it appear
// in the admin builder and in every form that renders custom fields.
export const FIELD_TYPES = [
  { value: 'text', label: 'טקסט קצר', icon: Type },
  { value: 'textarea', label: 'טקסט ארוך', icon: AlignLeft },
  { value: 'number', label: 'מספר', icon: Hash },
  { value: 'date', label: 'תאריך', icon: Calendar },
  { value: 'select', label: 'בחירה מרשימה', icon: ChevronDown, hasOptions: true },
  { value: 'checkbox', label: 'תיבת סימון', icon: ToggleLeft },
  { value: 'url', label: 'קישור', icon: Link2 },
  { value: 'email', label: 'אימייל', icon: Mail },
  { value: 'phone', label: 'טלפון', icon: Phone },
  { value: 'person', label: 'אחראי (מתוך המשתמשים)', icon: User },
];

export const FIELD_TYPE_MAP = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t]));

// Entities that support custom fields.
//
// The three below predate the schema engine and have no schema to read. Every
// schema-driven module is added automatically, so a module declared tomorrow
// supports custom fields the same day — and one left out of the build is not
// offered at all.
const LEGACY_CUSTOM_FIELD_ENTITIES = [
  { value: 'Project', label: 'פרויקט' },
  { value: 'Task', label: 'משימה' },
  { value: 'SupportTicket', label: 'פנייה' },
];

export const CUSTOM_FIELD_ENTITIES = [
  ...LEGACY_CUSTOM_FIELD_ENTITIES,
  ...ACTIVE_MODULE_IDS
    .filter((id) => CRM_SCHEMAS[id])
    .map((id) => ({ value: CRM_SCHEMAS[id].entity, label: CRM_SCHEMAS[id].title }))
    .filter((e) => !LEGACY_CUSTOM_FIELD_ENTITIES.some((l) => l.value === e.value)),
];

const HEBREW = /[\u0590-\u05FF]/;

/** Stable machine key derived from the label; Hebrew labels get a hashed key. */
export function fieldKeyFrom(label, existingKeys = []) {
  let base = String(label || '').trim().toLowerCase();
  base = HEBREW.test(base)
    ? 'field_' + Math.abs([...base].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36)
    : base.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (!base) base = 'field';
  let key = base;
  let i = 2;
  while (existingKeys.includes(key)) key = `${base}_${i++}`;
  return key;
}

export const emptyValueFor = (type) => (type === 'checkbox' ? false : '');

/** Missing required fields, as readable labels. */
export function validateCustomFields(fields, values = {}) {
  return fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key];
      return f.type === 'checkbox' ? v !== true : !String(v ?? '').trim();
    })
    .map((f) => f.label);
}

/** Human-readable rendering of a stored value. */
export function formatCustomValue(field, value) {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'checkbox') return value ? 'כן' : 'לא';
  if (field.type === 'number') return Number(value).toLocaleString();
  return String(value);
}

export const sortFields = (fields) =>
  [...(fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// ─────────────────────────────────────────────────────────────────────────────
// CONDITIONAL FIELDS
//
// A field that only matters sometimes should only be asked for sometimes. A
// custom field may declare `visible_when: { field, operator, value }`, using
// exactly the operators the automations already use — one vocabulary for
// "when is this true", not two.
//
// The rule is evaluated against the OTHER custom field values on the same
// record, because that is the set a person filling the form can see and change.
// ─────────────────────────────────────────────────────────────────────────────

export const VISIBILITY_OPERATORS = CONDITION_OPERATORS;

const text = (value) => String(value ?? '').trim().toLowerCase();

/** Is one visibility condition satisfied? */
export function conditionMet(condition, values = {}) {
  if (!condition?.field || !condition?.operator) return true;
  const actual = values[condition.field];
  const expected = condition.value;
  switch (condition.operator) {
    case 'eq': return text(actual) === text(expected);
    case 'neq': return text(actual) !== text(expected);
    case 'gt': return Number(actual) > Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'contains': return text(actual).includes(text(expected));
    case 'empty': return actual === undefined || actual === null || String(actual).trim() === '' || actual === false;
    case 'not_empty': return !(actual === undefined || actual === null || String(actual).trim() === '' || actual === false);
    default: return true;
  }
}

/** Should this field be shown, given the values entered so far? */
export const isFieldVisible = (field, values = {}) => conditionMet(field?.visible_when, values);

/** Only the fields a person should currently see. */
export const visibleFields = (fields = [], values = {}) =>
  fields.filter((f) => isFieldVisible(f, values));

/**
 * Values with anything hidden stripped out.
 *
 * Without this, answering a question, changing the answer that made it appear,
 * and saving would store a value for a question the record no longer asks —
 * which then shows up in a report as a fact nobody stated.
 */
export function pruneHiddenValues(fields = [], values = {}) {
  const visible = new Set(visibleFields(fields, values).map((f) => f.key));
  const out = {};
  for (const [key, value] of Object.entries(values)) {
    const field = fields.find((f) => f.key === key);
    if (!field || visible.has(key)) out[key] = value;
  }
  return out;
}

/** Required fields that are actually being asked — a hidden one cannot be missing. */
export const validateVisibleCustomFields = (fields, values = {}) =>
  validateCustomFields(visibleFields(fields, values), values);

// ─────────────────────────────────────────────────────────────────────────────
// FORM LAYOUT
//
// A custom field used to appear in one place only: a block at the bottom of the
// form, under "שדות נוספים". That is fine for one afterthought and wrong for a
// field that belongs in the middle of the story — a PO number belongs beside
// the amount, not three sections below it.
//
// A field may therefore declare `after`: the key of the built-in field it
// should follow. `LAYOUT_START` puts it first, and a field with no `after` (or
// one naming a field that no longer exists) falls back to the end — which is
// exactly the old behaviour, so nothing that exists today moves.
//
// Only the position is stored. The built-in fields are not reordered and not
// copied anywhere: they come from the schema, and the schema stays the one
// description of what a record is.
// ─────────────────────────────────────────────────────────────────────────────

export const LAYOUT_START = '__start__';
export const LAYOUT_END = '__end__';

// The three entities that predate the schema engine have no schema to read, so
// their forms are described here — the same fields those screens render, in the
// order they render them. Without this the layout editor had nothing to place
// against and showed an empty box, which is exactly the case someone reaches
// first: a task is the most obvious thing to add a field to.
//
// These keys are anchors, not storage. They name the block a custom field
// should follow; the forms themselves are unchanged.
const LEGACY_FORM_FIELDS = {
  Task: [
    { key: 'title', label: 'כותרת המשימה' },
    { key: 'checklist', label: 'צ׳קליסט' },
    { key: 'project_id', label: 'פרויקט' },
    { key: 'priority', label: 'עדיפות' },
    { key: 'status', label: 'סטטוס' },
    { key: 'details', label: 'אחראי ותאריך יעד' },
  ],
  SupportTicket: [
    { key: 'urgency', label: 'דחיפות' },
    { key: 'title', label: 'כותרת' },
    { key: 'description', label: 'תיאור מפורט' },
    { key: 'image_urls', label: 'צילומי מסך' },
  ],
  Project: [
    { key: 'client_name', label: 'שם הלקוח' },
    { key: 'contract_value', label: 'שווי חוזה' },
  ],
};

/**
 * The form an entity actually renders, in the order it renders it.
 *
 * Schema-driven modules describe themselves; the three that predate the engine
 * are described above. Either way this is the one answer to "what are the
 * positions in this form", so the editor and the form cannot disagree.
 */
export function formFieldsOf(entity) {
  const schema = Object.values(CRM_SCHEMAS).find((s) => s.entity === entity);
  // A derived field has no input, so nothing can sit "after" it in a way a
  // person would recognise. It is left out of the anchors entirely.
  if (schema) return schema.fields.filter((f) => !f.derive);
  return LEGACY_FORM_FIELDS[entity] || [];
}

/**
 * The form as a list of slots: each built-in field, with whatever custom fields
 * were placed after it.
 *
 * @param {Array} formFields   the built-in fields, in schema order
 * @param {Array} customFields the admin-defined fields for the same entity
 * @returns {Array<{ key, field, custom: Array }>} one entry per slot
 */
export function layoutSlots(formFields = [], customFields = []) {
  const known = new Set(formFields.map((f) => f.key));
  const sorted = sortFields(customFields).filter((f) => !f.hidden);

  const anchorOf = (field) => {
    if (field.after === LAYOUT_START) return LAYOUT_START;
    // A field pinned after something that has since been removed from the
    // schema is not lost — it goes back to the end, where it can be seen.
    return known.has(field.after) ? field.after : LAYOUT_END;
  };

  const slots = [
    { key: LAYOUT_START, field: null, custom: [] },
    ...formFields.map((field) => ({ key: field.key, field, custom: [] })),
    { key: LAYOUT_END, field: null, custom: [] },
  ];
  const byKey = new Map(slots.map((s) => [s.key, s]));
  for (const field of sorted) byKey.get(anchorOf(field)).custom.push(field);
  return slots;
}

/** The custom fields that were never given a position — rendered at the end. */
export const trailingFields = (formFields = [], customFields = []) => {
  const slots = layoutSlots(formFields, customFields);
  return slots[slots.length - 1].custom;
};

/** True when at least one field asked to sit somewhere in particular. */
export const hasPlacedFields = (formFields = [], customFields = []) =>
  layoutSlots(formFields, customFields).slice(0, -1).some((s) => s.custom.length > 0);

/**
 * Move a custom field to a new anchor, and renumber so the order within a slot
 * is the order it is displayed in.
 *
 * Returns only the fields whose stored values actually changed, so a drag that
 * moves one field writes one record rather than all of them.
 */
export function placeField(customFields, fieldId, after, index = null) {
  const sorted = sortFields(customFields);
  const moving = sorted.find((f) => f.id === fieldId);
  if (!moving) return [];

  const slotOf = (field) => field.after || LAYOUT_END;
  const rest = sorted.filter((f) => f.id !== fieldId);

  // The target slot, with the moved field dropped into place.
  const target = rest.filter((f) => slotOf(f) === after);
  const at = index === null || index > target.length ? target.length : Math.max(0, index);
  target.splice(at, 0, { ...moving, after });

  // `order` stays a total order across the entity, so two fields in the same
  // slot always come out in the same sequence they were left in.
  const others = rest.filter((f) => slotOf(f) !== after);
  const final = [...others, ...target];

  const changes = [];
  final.forEach((field, i) => {
    const original = sorted.find((f) => f.id === field.id);
    if (original.order !== i || slotOf(original) !== slotOf(field)) {
      changes.push({ id: field.id, order: i, after: slotOf(field) });
    }
  });
  return changes;
}

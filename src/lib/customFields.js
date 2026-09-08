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

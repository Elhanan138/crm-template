import {
  Type, AlignLeft, Hash, Calendar, ChevronDown, ToggleLeft, Link2, Mail, Phone, User,
} from 'lucide-react';

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

// Entities that support custom fields. Extend here, not in the UI.
export const CUSTOM_FIELD_ENTITIES = [
  { value: 'Project', label: 'פרויקט' },
  { value: 'Task', label: 'משימה' },
  { value: 'SupportTicket', label: 'פנייה' },
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

import { accountKey } from '@/lib/crm/accountKey';
import { readField } from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE DETECTION
//
// `accountKey` already knows that "בלוסום בע\"מ" and "בלוסום בעמ" are one
// customer. Nothing ever said so out loud: the same contact could be entered
// three times and each copy looked like a separate record.
//
// A duplicate is decided on the field that identifies the record — its title,
// plus an email or a phone number where the schema has one. Two records match
// when any identifying value normalises to the same thing. Nothing is merged
// automatically: detection proposes, a person decides.
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_TYPES = new Set(['email']);
const PHONE_TYPES = new Set(['phone']);

/** Digits only — spacing, dashes and a leading zero or +972 must not matter. */
export const phoneKey = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length < 7) return '';
  // Compare on the last nine digits so 050-123-4567, +972501234567 and
  // 0501234567 all land on the same customer.
  return digits.slice(-9);
};

export const emailKey = (value) => String(value ?? '').trim().toLowerCase();

/** The fields that identify a record of this schema. */
export function identityFieldsOf(schema) {
  const fields = schema?.fields || [];
  const title = fields.find((f) => f.key === schema?.titleField);
  const email = fields.find((f) => EMAIL_TYPES.has(f.type));
  const phone = fields.find((f) => PHONE_TYPES.has(f.type));
  return [title, email, phone].filter(Boolean);
}

/** Every comparable identity a record carries, as `${kind}:${value}` strings. */
export function identityKeysOf(schema, record) {
  const keys = [];
  for (const field of identityFieldsOf(schema)) {
    const raw = readField(field, record);
    if (EMAIL_TYPES.has(field.type)) {
      const key = emailKey(raw);
      if (key) keys.push(`email:${key}`);
    } else if (PHONE_TYPES.has(field.type)) {
      const key = phoneKey(raw);
      if (key) keys.push(`phone:${key}`);
    } else {
      const key = accountKey(raw);
      if (key) keys.push(`name:${key}`);
    }
  }
  return keys;
}

/**
 * Groups of records that look like the same thing.
 *
 * Matching is transitive on purpose: A shares a phone with B, B shares an email
 * with C, so all three are one person. Anything that resolves to a single
 * record is not a duplicate and is left out.
 */
export function findDuplicates(schema, records = []) {
  const parent = new Map();
  const find = (k) => {
    while (parent.get(k) !== k) {
      parent.set(k, parent.get(parent.get(k)));
      k = parent.get(k);
    }
    return k;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const add = (k) => { if (!parent.has(k)) parent.set(k, k); };

  const keysByRecord = new Map();
  for (const record of records) {
    const keys = identityKeysOf(schema, record);
    if (keys.length === 0) continue;
    keysByRecord.set(record.id, keys);
    const self = `id:${record.id}`;
    add(self);
    for (const key of keys) {
      add(key);
      union(self, key);
    }
  }

  const groups = new Map();
  for (const record of records) {
    if (!keysByRecord.has(record.id)) continue;
    const root = find(`id:${record.id}`);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(record);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    // The oldest record is listed first: it is the one a merge keeps by default,
    // because everything else in the system already points at it.
    .map((group) => [...group].sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || ''))))
    .sort((a, b) => b.length - a.length);
}

/**
 * One record built from several.
 *
 * The survivor's own values win; a field it left empty is filled from the
 * others, oldest first. Nothing is invented and nothing is overwritten — a
 * merge may only ever ADD information to the record that is kept.
 */
export function mergeRecords(schema, survivor, others) {
  const merged = { ...survivor };
  const isEmpty = (v) => v === undefined || v === null || v === '' ||
    (Array.isArray(v) && v.length === 0);

  for (const field of schema?.fields || []) {
    if (field.derive) continue;
    if (!isEmpty(merged[field.key])) continue;
    const donor = others.find((r) => !isEmpty(r?.[field.key]));
    if (donor) merged[field.key] = donor[field.key];
  }
  return merged;
}

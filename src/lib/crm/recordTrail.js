import { readField } from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// RECORD TRAIL — history, activity and files on a single record.
//
// The system already wrote to an `AuditLog` entity and had no screen that read
// it back: nobody could answer "who moved this deal to negotiation, and when".
// And a CRM where you cannot log the call you just made, or attach the signed
// contract, sends people back to email.
//
// Three collections, one shape, so one component renders all of them:
//   RecordHistory  — automatic, written on save; what changed, from what to what
//   RecordActivity — typed by a person: a call, a meeting, a note
//   RecordFile     — an attachment
//
// Everything is addressed by (entity, record_id), so this works for any module
// without a single one of them declaring it.
// ─────────────────────────────────────────────────────────────────────────────

export const HISTORY_ENTITY = 'RecordHistory';
export const ACTIVITY_ENTITY = 'RecordActivity';
export const FILE_ENTITY = 'RecordFile';

export const ACTIVITY_TYPES = [
  { value: 'note', label: 'הערה', tone: 'muted' },
  { value: 'call', label: 'שיחה', tone: 'info' },
  { value: 'meeting', label: 'פגישה', tone: 'accent' },
  { value: 'email', label: 'מייל', tone: 'info' },
  { value: 'task', label: 'משימה', tone: 'warning' },
];

export const activityMeta = (value) =>
  ACTIVITY_TYPES.find((t) => t.value === value) || ACTIVITY_TYPES[0];

const isEmpty = (v) => v === undefined || v === null || v === '';

/**
 * What actually changed between two versions of a record.
 *
 * Only declared, non-derived fields are compared: a derived value moves because
 * its inputs did, and logging it would report the same edit twice. Values are
 * captured as they were stored, and rendered through the schema later, so a
 * history entry stays readable after an option's label is reworded.
 */
export function diffRecord(schema, before, after) {
  const changes = [];
  for (const field of schema?.fields || []) {
    if (field.derive) continue;
    const from = before?.[field.key];
    const to = after?.[field.key];
    if (isEmpty(from) && isEmpty(to)) continue;
    if (JSON.stringify(from ?? null) === JSON.stringify(to ?? null)) continue;
    changes.push({ key: field.key, label: field.label, from: from ?? null, to: to ?? null });
  }
  return changes;
}

/** The history entry for one save, or null when nothing actually moved. */
export function historyEntryFor({ schema, entity, before, after, actor }) {
  const created = !before?.id;
  const changes = created ? [] : diffRecord(schema, before, after);
  if (!created && changes.length === 0) return null;
  return {
    entity,
    record_id: after?.id || before?.id,
    action: created ? 'create' : 'update',
    actor: actor || '',
    changes,
    created_date: new Date().toISOString(),
  };
}

/** Render one changed value the way the list would show it. */
export function describeValue(schema, key, value) {
  const field = (schema?.fields || []).find((f) => f.key === key);
  if (isEmpty(value)) return '—';
  if (field?.options) {
    return field.options.find((o) => String(o.value) === String(value))?.label ?? String(value);
  }
  if (field?.type === 'checkbox') return value ? 'כן' : 'לא';
  return String(value);
}

/** A record's identifying text, for a trail entry that names it. */
export const titleOf = (schema, record) =>
  String(readField((schema?.fields || []).find((f) => f.key === schema?.titleField) || {}, record) || '')
  || schema?.singular
  || '';

// ─────────────────────────────────────────────────────────────────────────────
// LIST INTELLIGENCE
//
// Fifteen modules share one list component, and that component knew how to do
// exactly one thing: print every row in a flat table. A table without a headline
// number, a saved filter, a sort or a bulk action is a place to look things up,
// not a place to work — which is why fifteen of them read as fifteen pages that
// do not earn their keep.
//
// Everything here is DERIVED from the schema a module already declares. No
// module lists its KPIs, its segments or its board columns: a field typed
// `currency` is something to total, a `select` carrying tones is a status to
// group and filter by, a date field named like a deadline is something that can
// be late. Declare a new module and it arrives with all of it.
// ─────────────────────────────────────────────────────────────────────────────

import { accountKey } from '@/lib/crm/accountKey';

// "Finished" cannot be read off the tone alone: `muted` is worn both by the
// FIRST state of a flow (draft, new) and by its dead end (void, lost). Treating
// every muted row as closed would quietly drop every draft out of the open
// figures. So: the success tone, plus the vocabulary the schemas actually use
// for a dead end.
const CLOSED_TONES = new Set(['success']);
const TERMINAL_VALUES = new Set([
  'void', 'cancelled', 'canceled', 'lost', 'churned', 'rejected', 'archived',
  'closed', 'done', 'complete', 'completed', 'paid', 'resolved', 'inactive',
]);
// Tones that mean "look at this".
const ALERT_TONES = new Set(['warning', 'destructive']);

// A date field whose name reads like a commitment: something that can be missed.
const DEADLINE_KEY = /(due|expected|close|closing|end|renew|renewal|expiry|expires|review|next|target|deadline|delivery|start)/;

// Short free-text fields worth grouping by; long ones are not.
const GROUPABLE_TEXT = /(^|_)(category|type|status|stage|source|department|role|unit|framework|company|supplier|site|plan|location|industry|size|cost_center|position|client_name|customer)($|_)/;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const asDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** The select field that carries the module's status, if it has one. */
export const statusFieldOf = (schema) =>
  (schema?.fields || []).find((f) => f.type === 'select' && f.options?.[0]?.tone !== undefined) ||
  (schema?.fields || []).find((f) => f.type === 'select') ||
  null;

/** The field that represents money for this module. */
export const moneyFieldOf = (schema) =>
  (schema?.fields || []).find((f) => f.type === 'currency') || null;

/** The date field that can be late. */
export const deadlineFieldOf = (schema) =>
  (schema?.fields || []).find((f) => f.type === 'date' && DEADLINE_KEY.test(f.key)) ||
  (schema?.fields || []).find((f) => f.type === 'date') ||
  null;

/** The field that names who owns a record. */
export const ownerFieldOf = (schema) =>
  (schema?.fields || []).find((f) => f.type === 'person') || null;

const toneOf = (field, record) =>
  field?.options?.find((o) => String(o.value) === String(record?.[field.key]))?.tone;

const isClosed = (statusField, record) => {
  if (!statusField) return false;
  if (CLOSED_TONES.has(toneOf(statusField, record))) return true;
  return TERMINAL_VALUES.has(String(record?.[statusField.key] ?? '').toLowerCase());
};

const isOverdue = (schema, record, today = startOfToday()) => {
  const field = deadlineFieldOf(schema);
  if (!field) return false;
  const date = asDate(record?.[field.key]);
  return !!date && date < today && !isClosed(statusFieldOf(schema), record);
};

export { isOverdue };

/**
 * The three or four numbers that answer "why am I looking at this page".
 * `format` is injected so this module stays free of currency formatting.
 */
export function statsFor(schema, records = [], { formatCurrency = String } = {}) {
  if (!records.length) return [];
  const statusField = statusFieldOf(schema);
  const moneyField = moneyFieldOf(schema);
  const deadlineField = deadlineFieldOf(schema);
  const today = startOfToday();

  const stats = [{ label: `סה"כ ${schema.title}`, value: records.length.toLocaleString() }];

  if (moneyField) {
    const open = statusField ? records.filter((r) => !isClosed(statusField, r)) : records;
    const total = open.reduce((sum, r) => sum + Number(r[moneyField.key] || 0), 0);
    stats.push({
      label: statusField ? `${moneyField.label} — פתוח` : `${moneyField.label} — סה"כ`,
      value: formatCurrency(total),
      accent: true,
    });
  }

  if (statusField) {
    const attention = records.filter((r) => ALERT_TONES.has(toneOf(statusField, r))).length;
    stats.push({ label: 'דורש טיפול', value: attention.toLocaleString(), alert: attention > 0 });
  }

  if (deadlineField) {
    const late = records.filter((r) => isOverdue(schema, r, today)).length;
    stats.push({ label: `${deadlineField.label} — באיחור`, value: late.toLocaleString(), alert: late > 0 });
  }

  // A module with neither money, status nor a deadline still deserves a second
  // number: how much of this arrived recently.
  if (stats.length < 2) {
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const recent = records.filter((r) => {
      const created = asDate(r.created_date);
      return created && created >= monthAgo;
    }).length;
    stats.push({ label: 'נוספו החודש', value: recent.toLocaleString() });
  }

  return stats.slice(0, 4);
}

/**
 * Saved views. Every leading system opens on "the slice I care about", not on
 * every row ever created.
 */
export function segmentsFor(schema, { myEmail = '', myName = '' } = {}) {
  const statusField = statusFieldOf(schema);
  const deadlineField = deadlineFieldOf(schema);
  const ownerField = ownerFieldOf(schema);
  const mineKeys = [ownerField?.key, ...(schema?.mineByName || [])].filter(Boolean);

  const segments = [{ id: 'all', label: 'הכל', test: () => true }];

  if (statusField) {
    segments.push({
      id: 'open',
      label: 'פתוחים',
      test: (r) => !isClosed(statusField, r),
    });
  }

  if (mineKeys.length && (myEmail || myName)) {
    segments.push({
      id: 'mine',
      label: 'שלי',
      test: (r) =>
        mineKeys.some((key) => {
          const value = String(r?.[key] ?? '').trim().toLowerCase();
          return !!value && (value === myEmail || value === myName);
        }),
    });
  }

  if (statusField) {
    segments.push({
      id: 'attention',
      label: 'דורש טיפול',
      test: (r) => ALERT_TONES.has(toneOf(statusField, r)),
    });
  }

  if (deadlineField) {
    segments.push({ id: 'overdue', label: 'באיחור', test: (r) => isOverdue(schema, r) });
    segments.push({
      id: 'soon',
      label: 'ב-30 הימים הקרובים',
      test: (r) => {
        const date = asDate(r?.[deadlineField.key]);
        if (!date) return false;
        const today = startOfToday();
        const horizon = new Date(today);
        horizon.setDate(horizon.getDate() + 30);
        return date >= today && date <= horizon && !isClosed(statusFieldOf(schema), r);
      },
    });
  }

  return segments;
}

/** Fields worth grouping rows by. */
export function groupOptionsFor(schema) {
  return (schema?.fields || [])
    .filter(
      (f) =>
        ['select', 'relation', 'person', 'checkbox'].includes(f.type) ||
        (f.type === 'text' && GROUPABLE_TEXT.test(f.key))
    )
    .map((f) => ({ key: f.key, label: f.label }));
}

/** Board columns: an explicit declaration, or the status field it already has. */
export function boardConfigFor(schema) {
  if (schema?.boardField && schema?.boardStages?.length) {
    return { field: schema.boardField, stages: schema.boardStages };
  }
  const statusField = statusFieldOf(schema);
  if (statusField?.options?.length && statusField.options[0].tone !== undefined) {
    return { field: statusField.key, stages: statusField.options };
  }
  return null;
}

const NUMERIC_TYPES = new Set(['number', 'currency', 'percent']);

/** Type-aware sort. Empty values always sink to the bottom, either direction. */
export function sortRecords(records, sort, schema) {
  if (!sort?.key) return records;
  const field = (schema?.fields || []).find((f) => f.key === sort.key);
  const factor = sort.dir === 'desc' ? -1 : 1;
  const empty = (v) => v === undefined || v === null || v === '';

  return [...records].sort((a, b) => {
    const av = a?.[sort.key];
    const bv = b?.[sort.key];
    if (empty(av) && empty(bv)) return 0;
    if (empty(av)) return 1;
    if (empty(bv)) return -1;

    if (field && NUMERIC_TYPES.has(field.type)) return (Number(av) - Number(bv)) * factor;
    if (field?.type === 'date') return (new Date(av) - new Date(bv)) * factor;
    if (field?.type === 'checkbox') return ((av ? 1 : 0) - (bv ? 1 : 0)) * factor;
    if (field?.type === 'select') {
      // Sort by the order the schema declares, not alphabetically: a pipeline
      // reads new → won, never "אבוד" first because the alphabet says so.
      const order = (value) => field.options?.findIndex((o) => String(o.value) === String(value)) ?? -1;
      return (order(av) - order(bv)) * factor;
    }
    return String(av).localeCompare(String(bv), 'he') * factor;
  });
}

// Fields that name a customer or a supplier. Grouping them by raw text would
// list "בלוסום בע\"מ" and "בלוסום בעמ" as two different customers in the same
// report — the exact failure accountKey exists to prevent.
const ACCOUNT_KEYS = new Set(['company', 'client_name', 'customer', 'supplier']);

/** Group rows for display, preserving the schema's own option order. */
export function groupRecords(records, groupKey, schema, formatValue) {
  if (!groupKey) return null;
  const field = (schema?.fields || []).find((f) => f.key === groupKey);
  const byAccount = ACCOUNT_KEYS.has(groupKey);
  const buckets = new Map();

  for (const record of records) {
    const shown = formatValue(field, record[groupKey]) || '—';
    // Bucket on identity, label with the first spelling encountered.
    const id = byAccount ? accountKey(record[groupKey]) || shown : shown;
    if (!buckets.has(id)) buckets.set(id, { label: shown, items: [] });
    buckets.get(id).items.push(record);
  }

  const declared = (field?.options || []).map((o) => o.label);
  const order = (label) => {
    const index = declared.indexOf(label);
    return index === -1 ? declared.length : index;
  };

  return [...buckets.values()]
    .sort((a, b) => order(a.label) - order(b.label) || a.label.localeCompare(b.label, 'he'));
}

/**
 * The visible view as a spreadsheet. The BOM is not optional — without it Excel
 * opens Hebrew as mojibake, which is the whole reason people stop trusting an
 * export and go back to copying rows by hand.
 */
export function toCsv(records, columns, formatValue) {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const rows = records.map((r) => columns.map((c) => escape(formatValue(c, r[c.key]))).join(','));
  return `﻿${[header, ...rows].join('\r\n')}`;
}

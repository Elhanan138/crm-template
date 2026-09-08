// ─────────────────────────────────────────────────────────────────────────────
// DERIVED FIELDS
//
// Every module stored what someone typed and showed it back. What none of them
// showed is the number the people who do this work actually read: a pipeline is
// judged on weighted value, receivables on the balance and how late it is, a
// subscription book on MRR, stock on what it is worth and what has run out, a
// risk register on likelihood × impact.
//
// A derived field declares `derive(record)` instead of holding data. It is
// computed on read, so it needs no migration, no extra typing and no storage —
// and because it is an ordinary field it flows into the list, the sort, the
// grouping, the CSV, the report and the board without any of them knowing.
//
// It is never editable: the inputs are.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86400000;

export const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// A date FIELD holds a calendar day ("2026-09-08"), not an instant. `new Date`
// reads that as UTC midnight, which east of Greenwich lands on the previous day
// once compared against a local midnight — so "due today" read as overdue and
// every day count came out one short. A bare date is parsed as a LOCAL day;
// anything carrying a time is left alone.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const day = value.match(DATE_ONLY);
    if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Whole days from `value` until today. Positive means the date has passed. */
export function daysSince(value) {
  const date = parseDate(value);
  return date === null ? null : Math.floor((startOfToday() - date) / DAY);
}

/** Whole days from today until `value`. Positive means it is still ahead. */
export function daysUntil(value) {
  const days = daysSince(value);
  return days === null ? null : -days;
}

export function yearsSince(value) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.floor((startOfToday() - date) / (DAY * 365.25) * 10) / 10;
}

/**
 * The value of a field on a record — computed for a derived field, stored
 * otherwise. Everything that reads a field goes through here, which is what
 * keeps a derived column sortable, groupable and exportable like any other.
 */
export const readField = (field, record) =>
  field?.derive ? field.derive(record || {}) : record?.[field?.key];

export const isDerived = (field) => typeof field?.derive === 'function';

// ── Shared derivations ───────────────────────────────────────────────────────

/** What is still owed on an invoice, VAT included. */
export const invoiceBalance = (r) => {
  const gross = num(r.amount) * (1 + num(r.vat_percent) / 100);
  return Math.max(0, Math.round(gross - num(r.paid_amount)));
};

/** Days past the due date, for anything still owed. */
export const invoiceOverdueDays = (r) => {
  if (invoiceBalance(r) <= 0 || ['paid', 'void'].includes(r.status)) return null;
  const late = daysSince(r.due_date);
  return late !== null && late > 0 ? late : null;
};

/** A deal's value discounted by the probability its stage carries. */
export const weightedValue = (stages) => (r) => {
  const probability = stages.find((s) => s.value === r.stage)?.probability ?? 0;
  return Math.round(num(r.value) * (probability / 100));
};

/** One period's price normalised to a month. */
export const monthlyRevenue = (cycles) => (r) => {
  if (['churned'].includes(r.status)) return 0;
  const months = cycles.find((c) => c.value === r.billing_cycle)?.months || 1;
  return Math.round(num(r.amount) / months);
};

/** What the shelf is worth. */
export const stockValue = (r) => Math.round(num(r.quantity) * num(r.unit_cost));

/** Out of stock, below the reorder point, or fine. */
export const stockState = (r) => {
  if (num(r.quantity) <= 0) return 'out';
  if (r.reorder_point && num(r.quantity) <= num(r.reorder_point)) return 'low';
  return 'ok';
};

export const STOCK_STATES = [
  { value: 'ok', label: 'תקין', tone: 'success' },
  { value: 'low', label: 'מתחת לנקודת הזמנה', tone: 'warning' },
  { value: 'out', label: 'אזל', tone: 'destructive' },
];

/** The standard 5×5 register score. */
export const riskScore = (r) => num(r.likelihood) * num(r.impact);

export const RISK_BANDS = [
  { max: 4, value: 'low', label: 'נמוך', tone: 'success' },
  { max: 9, value: 'medium', label: 'בינוני', tone: 'info' },
  { max: 14, value: 'high', label: 'גבוה', tone: 'warning' },
  { max: 25, value: 'critical', label: 'קריטי', tone: 'destructive' },
];

export const riskBand = (r) => RISK_BANDS.find((b) => riskScore(r) <= b.max)?.value ?? 'low';

/** Hours booked against a work order, priced at a single blended rate. */
export const workOrderCost = (rate) => (r) => Math.round(num(r.parts_cost) + num(r.labor_hours) * rate);

/** Whether a work order is still inside its service commitment. */
export const slaState = (r) => {
  if (!r.sla_due) return 'none';
  if (['done', 'cancelled'].includes(r.status)) {
    const completed = parseDate(r.completed_date);
    const due = parseDate(r.sla_due);
    if (!completed || !due) return 'none';
    return completed <= due ? 'met' : 'breached';
  }
  return daysSince(r.sla_due) > 0 ? 'breached' : 'open';
};

export const SLA_STATES = [
  { value: 'open', label: 'בתוך היעד', tone: 'info' },
  { value: 'met', label: 'עמד ביעד', tone: 'success' },
  { value: 'breached', label: 'חריגה', tone: 'destructive' },
  { value: 'none', label: 'ללא יעד', tone: 'muted' },
];

/** Warranty state of an asset. */
export const warrantyState = (r) => {
  if (!r.warranty_until) return 'none';
  const left = daysUntil(r.warranty_until);
  if (left < 0) return 'expired';
  return left <= 60 ? 'ending' : 'valid';
};

export const WARRANTY_STATES = [
  { value: 'valid', label: 'בתוקף', tone: 'success' },
  { value: 'ending', label: 'פגה בקרוב', tone: 'warning' },
  { value: 'expired', label: 'פגה', tone: 'destructive' },
  { value: 'none', label: 'לא ידוע', tone: 'muted' },
];

/** Gross margin on a catalogue line. */
export const marginPercent = (r) => {
  const price = num(r.list_price);
  if (price <= 0) return null;
  return Math.round(((price - num(r.cost)) / price) * 100);
};

/** How long a record has sat where it is — the age of the last change. */
export const ageInStage = (r) => daysSince(r.updated_date || r.created_date);

/**
 * A record with its derived fields materialised onto it.
 *
 * The list reads fields through `readField`, but the report table reads rows
 * as plain objects in a dozen places — filtering, grouping, aggregating and
 * exporting. Computing the values once at the data boundary is what lets a
 * derived column be reported on exactly like a stored one.
 */
export function withDerived(schema, record) {
  const derivedFields = (schema?.fields || []).filter(isDerived);
  if (derivedFields.length === 0) return record;
  const out = { ...record };
  for (const field of derivedFields) out[field.key] = field.derive(record || {});
  return out;
}

export const withDerivedRows = (schema, records) =>
  (records || []).map((r) => withDerived(schema, r));

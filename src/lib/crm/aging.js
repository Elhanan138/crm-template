import { invoiceBalance, daysSince } from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// DEBT AGING
//
// "How much is owed, and how late is it" is the one question a receivables
// screen exists to answer, and the page used to answer it wrong twice.
//
//   1. It totalled `amount - paid_amount` — the figure BEFORE VAT. The balance
//      a customer actually owes is gross of VAT, which is what the `balance`
//      column beside it already showed. On an 18% VAT book the strip reported
//      18% less debt than the table under it.
//   2. It bucketed on `new Date(due_date)`, which reads a calendar day as UTC
//      midnight and lands on the previous day east of Greenwich — so an
//      invoice due today counted as one day late, and every boundary between
//      buckets was off by one.
//
// Both numbers now come from the same place the column does, so the strip and
// the table cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────

/** Statuses that mean nothing is owed any more, whatever the arithmetic says. */
const SETTLED = ['paid', 'void'];

/**
 * The buckets, in order, each with the greatest lateness it accepts.
 *
 * The tone is declared here rather than computed at render: a bucket means
 * something ("this is now a collection problem") and that meaning belongs
 * beside the band, not in the component drawing it.
 */
export const AGING_BUCKETS = [
  { key: 'current', label: 'בתוקף', upTo: 0, tone: 'neutral' },
  { key: 'd30', label: '1–30 יום', upTo: 30, tone: 'warning' },
  { key: 'd60', label: '31–60 יום', upTo: 60, tone: 'warning' },
  { key: 'd90', label: '61–90 יום', upTo: 90, tone: 'destructive' },
  { key: 'over', label: '90+ יום', upTo: Infinity, tone: 'destructive' },
];

export const agingBucket = (key) => AGING_BUCKETS.find((b) => b.key === key) || null;

/** Still owed: not settled, and a balance left over. */
export const isOutstanding = (invoice) =>
  !SETTLED.includes(invoice?.status) && invoiceBalance(invoice) > 0;

/**
 * Days past the due date. Zero or less means not yet due.
 *
 * An invoice with no due date is treated as not yet due rather than as
 * infinitely late: nobody agreed to a date, so nobody has missed one.
 */
export const overdueDays = (invoice) => {
  const late = daysSince(invoice?.due_date);
  return late === null ? 0 : late;
};

/** Which band an invoice falls in. */
export const bucketOf = (invoice) =>
  AGING_BUCKETS.find((b) => overdueDays(invoice) <= b.upTo) || AGING_BUCKETS[AGING_BUCKETS.length - 1];

/**
 * The predicate behind one bucket's number — the SAME test the tile totals
 * with, so pressing a tile can only ever show the rows it just counted.
 */
export const inBucket = (key) => (invoice) =>
  isOutstanding(invoice) && bucketOf(invoice).key === key;

/** What is owed, per band and in total. */
export function agingSummary(records = []) {
  const open = (records || []).filter(isOutstanding);
  const totals = Object.fromEntries(AGING_BUCKETS.map((b) => [b.key, { amount: 0, count: 0 }]));
  let outstanding = 0;
  let overdue = 0;

  for (const invoice of open) {
    const balance = invoiceBalance(invoice);
    const bucket = bucketOf(invoice);
    outstanding += balance;
    if (bucket.key !== 'current') overdue += balance;
    totals[bucket.key].amount += balance;
    totals[bucket.key].count += 1;
  }

  return { totals, outstanding, overdue, count: open.length };
}

import { describe, it, expect } from 'vitest';
import {
  AGING_BUCKETS, agingSummary, bucketOf, inBucket, isOutstanding, overdueDays,
} from './aging';
import { invoiceBalance } from './derived';
import { TONES, normalizeTone } from '../tones';
import { EN } from '../i18n/dictionary';

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 10,000 + 18% VAT = 11,800 owed. The strip used to report the 10,000.
const invoice = (over) => ({
  status: 'sent', amount: 10000, vat_percent: 18, paid_amount: 0, due_date: day(-over),
});

describe('what is still owed', () => {
  it('counts the balance GROSS of VAT, like the column beside it', () => {
    const rows = [invoice(5)];
    expect(invoiceBalance(rows[0])).toBe(11800);
    expect(agingSummary(rows).outstanding).toBe(11800);
  });

  it('nets off what has already come in', () => {
    expect(agingSummary([{ ...invoice(5), paid_amount: 1800 }]).outstanding).toBe(10000);
  });

  it('leaves out anything settled, however the arithmetic falls', () => {
    expect(isOutstanding({ status: 'paid', amount: 10000 })).toBe(false);
    expect(isOutstanding({ status: 'void', amount: 10000 })).toBe(false);
    // Paid in full but still marked 'sent': nothing is owed.
    expect(isOutstanding({ status: 'sent', amount: 10000, vat_percent: 18, paid_amount: 11800 })).toBe(false);
    expect(agingSummary([{ status: 'paid', amount: 10000 }]).count).toBe(0);
  });
});

describe('which band an invoice falls in', () => {
  it('treats an invoice due today as current, not as one day late', () => {
    // The old code read the due date as UTC midnight, which is the previous
    // local day east of Greenwich — so "due today" bucketed as overdue.
    expect(overdueDays(invoice(0))).toBe(0);
    expect(bucketOf(invoice(0)).key).toBe('current');
  });

  it('puts a future due date in current', () => {
    expect(bucketOf({ ...invoice(0), due_date: day(30) }).key).toBe('current');
  });

  it('lands each band on its own boundary', () => {
    expect(bucketOf(invoice(1)).key).toBe('d30');
    expect(bucketOf(invoice(30)).key).toBe('d30');
    expect(bucketOf(invoice(31)).key).toBe('d60');
    expect(bucketOf(invoice(60)).key).toBe('d60');
    expect(bucketOf(invoice(61)).key).toBe('d90');
    expect(bucketOf(invoice(90)).key).toBe('d90');
    expect(bucketOf(invoice(91)).key).toBe('over');
    expect(bucketOf(invoice(900)).key).toBe('over');
  });

  it('calls an invoice with no agreed due date current — nobody missed a date', () => {
    expect(bucketOf({ status: 'sent', amount: 100 }).key).toBe('current');
  });
});

describe('the summary adds up', () => {
  const rows = [invoice(0), invoice(10), invoice(40), invoice(200), { status: 'paid', amount: 5000 }];
  const summary = agingSummary(rows);

  it('splits the total across the bands without losing or double-counting', () => {
    const banded = AGING_BUCKETS.reduce((sum, b) => sum + summary.totals[b.key].amount, 0);
    expect(banded).toBe(summary.outstanding);
    expect(summary.count).toBe(4);
  });

  it('reports what is late separately from what is merely open', () => {
    expect(summary.outstanding).toBe(11800 * 4);
    expect(summary.overdue).toBe(11800 * 3);
  });

  it('counts rows per band as well as money', () => {
    expect(summary.totals.current.count).toBe(1);
    expect(summary.totals.d30.count).toBe(1);
    expect(summary.totals.d60.count).toBe(1);
    expect(summary.totals.over.count).toBe(1);
    expect(summary.totals.d90.count).toBe(0);
  });

  it('answers for an empty book instead of throwing', () => {
    for (const empty of [[], null, undefined]) {
      expect(agingSummary(empty).outstanding).toBe(0);
      expect(agingSummary(empty).count).toBe(0);
    }
  });
});

// A tile shows a figure and filters the list to the rows behind it. If the two
// came from different predicates, the figure and the rows would disagree.
describe('a band filters to exactly what it counted', () => {
  const rows = [invoice(0), invoice(10), invoice(40), invoice(200), { status: 'paid', amount: 5000 }];

  it('matches the row count the summary reported, band by band', () => {
    for (const bucket of AGING_BUCKETS) {
      expect(rows.filter(inBucket(bucket.key)), bucket.key)
        .toHaveLength(agingSummary(rows).totals[bucket.key].count);
    }
  });

  it('never matches a settled invoice', () => {
    for (const bucket of AGING_BUCKETS) {
      expect(inBucket(bucket.key)({ status: 'paid', amount: 10000, due_date: day(-200) })).toBe(false);
    }
  });

  it('puts every outstanding row in exactly one band', () => {
    for (const row of rows.filter(isOutstanding)) {
      expect(AGING_BUCKETS.filter((b) => inBucket(b.key)(row))).toHaveLength(1);
    }
  });
});

describe('a band says what it means', () => {
  it('carries a tone the one tone map knows', () => {
    for (const bucket of AGING_BUCKETS) {
      expect(TONES, bucket.key).toContain(normalizeTone(bucket.tone));
    }
  });

  it('reserves the alarming tone for debt that is genuinely old', () => {
    expect(normalizeTone(AGING_BUCKETS[0].tone)).toBe('neutral');
    expect(AGING_BUCKETS.at(-1).tone).toBe('destructive');
  });

  // The labels reach t() through the bucket, so the missing-string scan cannot
  // see them.
  it('has an English label for every band', () => {
    for (const bucket of AGING_BUCKETS) {
      expect(EN[bucket.label], `"${bucket.label}" has no English`).toBeTruthy();
    }
  });
});

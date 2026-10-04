import { describe, it, expect } from 'vitest';
import {
  productPerformance, performanceSummary, needsReview, priceVerdict, soldLines,
} from './productPerformance';
import { LINE_FIELD } from './lineItems';
import { TONES, normalizeTone } from '../tones';
import { EN } from '../i18n/dictionary';

const product = (over = {}) => ({
  id: 'p1', name: 'הדרכה', cost: 100, list_price: 200, max_discount_percent: 20, ...over,
});

const invoice = (lines) => ({ id: 'i1', status: 'sent', [LINE_FIELD]: lines });
const line = (over = {}) => ({
  product_id: 'p1', name: 'הדרכה', quantity: 1, unit_price: 200, discount_percent: 0, ...over,
});

describe('reading the lines that were actually sold', () => {
  it('ignores a free-text line that names no product', () => {
    const lines = soldLines([invoice([line(), { name: 'משהו', quantity: 1, unit_price: 50 }])]);
    expect(lines).toHaveLength(1);
  });

  it('survives a document with no lines at all', () => {
    expect(soldLines([{ id: 'i1' }, null, { id: 'i2', [LINE_FIELD]: null }])).toEqual([]);
    expect(soldLines(null)).toEqual([]);
  });

  it('leaves out a product nothing was sold from', () => {
    const rows = productPerformance([product(), product({ id: 'p2', name: 'ייעוץ' })], [invoice([line()])]);
    expect(rows.map((r) => r.id)).toEqual(['p1']);
  });
});

describe('the margin is the one realized, not the one on the price list', () => {
  it('charges the discount against the margin', () => {
    // 10 units at 200 less 25% = 1,500 charged; cost 10 x 100 = 1,000.
    const rows = productPerformance([product()], [invoice([line({ quantity: 10, discount_percent: 25 })])]);
    expect(rows[0].revenue).toBe(1500);
    expect(rows[0].marginPercent).toBeCloseTo(33.33, 1);
  });

  it('reports a margin gone negative rather than clamping it', () => {
    const rows = productPerformance([product({ cost: 300 })], [invoice([line()])]);
    expect(rows[0].marginPercent).toBeLessThan(0);
  });

  it('says nothing instead of zero when the catalogue never recorded a cost', () => {
    // An unknown margin and a zero margin are not the same answer.
    const rows = productPerformance([product({ cost: 0 })], [invoice([line()])]);
    expect(rows[0].marginPercent).toBeNull();
  });

  it('totals across every document, not just the first', () => {
    const rows = productPerformance([product()], [
      invoice([line({ quantity: 2 })]),
      { id: 'i2', [LINE_FIELD]: [line({ quantity: 3 })] },
    ]);
    expect(rows[0].units).toBe(5);
    expect(rows[0].lines).toBe(2);
    expect(rows[0].revenue).toBe(1000);
  });
});

describe('which price list is wrong', () => {
  it('flags a line sold past the ceiling the product declares', () => {
    const rows = productPerformance([product()], [invoice([line({ discount_percent: 35 })])]);
    expect(rows[0].breaches).toBe(1);
    expect(needsReview(rows[0])).toBe(true);
    expect(priceVerdict(rows[0]).tone).toBe('destructive');
  });

  // The expensive case: nobody broke a rule, the rule is simply wrong.
  it('flags a product sold AT its ceiling every single time', () => {
    const rows = productPerformance([product()], [invoice([
      line({ discount_percent: 20 }), line({ discount_percent: 19 }),
    ])]);
    expect(rows[0].breaches).toBe(0);
    expect(rows[0].underPressure).toBe(true);
    expect(priceVerdict(rows[0]).tone).toBe('warning');
  });

  it('treats one sale at the ceiling as a negotiation, not a pattern', () => {
    const rows = productPerformance([product()], [invoice([line({ discount_percent: 20 })])]);
    expect(rows[0].underPressure).toBe(false);
  });

  it('leaves a product alone when one sale out of three held the line', () => {
    const rows = productPerformance([product()], [invoice([
      line({ discount_percent: 20 }), line({ discount_percent: 20 }), line({ discount_percent: 0 }),
    ])]);
    expect(rows[0].underPressure).toBe(false);
    expect(needsReview(rows[0])).toBe(false);
    expect(priceVerdict(rows[0])).toBeNull();
  });

  it('says nothing about a product that declares no ceiling', () => {
    const rows = productPerformance([product({ max_discount_percent: 0 })], [invoice([
      line({ discount_percent: 60 }), line({ discount_percent: 70 }),
    ])]);
    expect(rows[0].breaches).toBe(0);
    expect(rows[0].underPressure).toBe(false);
    expect(needsReview(rows[0])).toBe(false);
  });

  it('weights the average discount by quantity, not by line', () => {
    // 100 units at 40% off and 1 unit at list: the product sells at a discount.
    const rows = productPerformance([product({ max_discount_percent: 0 })], [invoice([
      line({ quantity: 100, discount_percent: 40 }), line({ quantity: 1, discount_percent: 0 }),
    ])]);
    expect(rows[0].avgDiscount).toBeGreaterThan(39);
  });
});

describe('the headline', () => {
  const rows = productPerformance(
    [product(), product({ id: 'p2', name: 'ייעוץ', max_discount_percent: 10 })],
    [invoice([line({ discount_percent: 35 }), line({ product_id: 'p2', quantity: 2, unit_price: 500 })])],
  );

  it('counts how many products are priced wrong, and how', () => {
    const summary = performanceSummary(rows);
    expect(summary.sold).toBe(2);
    expect(summary.breached).toBe(1);
    expect(summary.revenue).toBe(rows.reduce((s, r) => s + r.revenue, 0));
  });

  it('answers for an empty catalogue instead of throwing', () => {
    expect(performanceSummary([])).toEqual({ sold: 0, revenue: 0, breached: 0, underPressure: 0 });
    expect(productPerformance(null, null)).toEqual([]);
  });

  it('puts the biggest earner first', () => {
    expect(rows[0].revenue).toBeGreaterThanOrEqual(rows[1].revenue);
  });
});

describe('a verdict says what it means', () => {
  it('carries a tone the one tone map knows, and a translatable label', () => {
    const cases = [
      productPerformance([product()], [invoice([line({ discount_percent: 35 })])])[0],
      productPerformance([product()], [invoice([line({ discount_percent: 20 }), line({ discount_percent: 20 })])])[0],
    ];
    for (const row of cases) {
      const verdict = priceVerdict(row);
      expect(TONES).toContain(normalizeTone(verdict.tone));
      expect(EN[verdict.label], `"${verdict.label}" has no English`).toBeTruthy();
    }
  });
});

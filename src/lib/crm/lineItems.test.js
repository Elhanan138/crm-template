import { describe, it, expect } from 'vitest';
import {
  LINE_SOURCES, lineSourceFor, catalogAvailable, emptyLine,
  lineTotal, lineTotals, lineFromProduct, discountBreach,
  isBlankLine, cleanLines, describeLines,
} from './lineItems';
import { CRM_SCHEMAS } from './schemas';

describe('which documents carry lines', () => {
  it('points every source at a catalogue and a total it can write', () => {
    for (const [moduleId, source] of Object.entries(LINE_SOURCES)) {
      expect(CRM_SCHEMAS[moduleId], `${moduleId} is not a schema module`).toBeTruthy();
      const totalField = CRM_SCHEMAS[moduleId].fields.find((f) => f.key === source.totalField);
      expect(totalField, `${moduleId} has no ${source.totalField} field`).toBeTruthy();
      if (source.vatField) {
        expect(CRM_SCHEMAS[moduleId].fields.some((f) => f.key === source.vatField)).toBe(true);
      }
    }
  });

  it('says nothing for a module that keeps no lines', () => {
    expect(lineSourceFor('leads')).toBeNull();
    expect(lineSourceFor('invoices')).toBeTruthy();
  });

  it('reports a missing catalogue instead of assuming it is there', () => {
    expect(catalogAvailable(LINE_SOURCES.invoices)).toBe(!!CRM_SCHEMAS.products);
    expect(catalogAvailable({ catalog: 'not-a-module' })).toBe(false);
    expect(catalogAvailable(null)).toBe(false);
  });
});

describe('what a line comes to', () => {
  it('multiplies quantity by price', () => {
    expect(lineTotal({ quantity: 3, unit_price: 250 })).toBe(750);
  });

  it('takes the discount off that, not off the unit price', () => {
    expect(lineTotal({ quantity: 2, unit_price: 100, discount_percent: 10 })).toBe(180);
  });

  it('treats a blank or nonsense figure as zero rather than NaN', () => {
    expect(lineTotal({})).toBe(0);
    expect(lineTotal({ quantity: '', unit_price: 100 })).toBe(0);
    expect(lineTotal({ quantity: 'שתיים', unit_price: 100 })).toBe(0);
  });

  it('refuses to turn a discount into a payment', () => {
    expect(lineTotal({ quantity: 1, unit_price: 100, discount_percent: 150 })).toBe(0);
    expect(lineTotal({ quantity: 1, unit_price: 100, discount_percent: -50 })).toBe(100);
  });

  it('reads a number typed as text, which is what an input gives back', () => {
    expect(lineTotal({ quantity: '2', unit_price: '150.5' })).toBe(301);
  });
});

describe('what a document comes to', () => {
  const lines = [
    { name: 'ייעוץ', quantity: 10, unit_price: 350 },
    { name: 'רישוי', quantity: 1, unit_price: 1200, discount_percent: 25 },
  ];

  it('adds the lines and applies VAT to the discounted subtotal', () => {
    const totals = lineTotals(lines, 18);
    expect(totals.subtotal).toBe(4400);
    expect(totals.vat).toBe(792);
    expect(totals.total).toBe(5192);
  });

  it('leaves the total alone when no VAT applies', () => {
    expect(lineTotals(lines, 0).total).toBe(4400);
    expect(lineTotals(lines).total).toBe(4400);
  });

  it('rounds to the agora, so a printed total is never one off', () => {
    const totals = lineTotals([{ quantity: 3, unit_price: 10.1 }], 17);
    expect(totals.subtotal).toBe(30.3);
    expect(totals.vat).toBe(5.15);
  });

  it('answers for nothing at all rather than throwing', () => {
    expect(lineTotals([], 18)).toEqual({ count: 0, subtotal: 0, vat: 0, total: 0 });
    expect(lineTotals(null).total).toBe(0);
    expect(lineTotals(undefined).total).toBe(0);
  });
});

describe('picking from the catalogue', () => {
  const product = { id: 'p1', name: 'ייעוץ', list_price: 350, max_discount_percent: 10 };

  it('carries the price and keeps the link back to the product', () => {
    const line = lineFromProduct(product, LINE_SOURCES.invoices);
    expect(line.product_id).toBe('p1');
    expect(line.name).toBe('ייעוץ');
    expect(line.unit_price).toBe(350);
    expect(line.quantity).toBe(1);
  });

  it('reads the price field the source names, not one fixed name', () => {
    const item = { id: 'i1', name: 'ברגים', unit_cost: 4.5 };
    expect(lineFromProduct(item, LINE_SOURCES.purchasing).unit_price).toBe(4.5);
  });

  it('falls back to an empty line rather than a broken one', () => {
    expect(lineFromProduct(null, LINE_SOURCES.invoices)).toEqual(emptyLine());
  });

  it('flags a discount past the product ceiling — and only past it', () => {
    expect(discountBreach({ discount_percent: 20 }, product)).toEqual({ max: 10, asked: 20 });
    expect(discountBreach({ discount_percent: 10 }, product)).toBeNull();
    expect(discountBreach({ discount_percent: 90 }, { name: 'no ceiling' })).toBeNull();
    expect(discountBreach({ discount_percent: 90 }, undefined)).toBeNull();
  });
});

describe('what gets saved', () => {
  it('drops the row someone opened and left blank', () => {
    const lines = [{ name: 'ייעוץ', quantity: 1, unit_price: 100 }, emptyLine(), { name: '', quantity: 0, unit_price: 0 }];
    // emptyLine() has a quantity of 1, so it is a real row with no price yet.
    expect(cleanLines(lines)).toHaveLength(2);
    expect(isBlankLine({ name: '  ', quantity: 0, unit_price: 0 })).toBe(true);
    expect(isBlankLine({ name: 'ייעוץ' })).toBe(false);
  });

  it('summarises the lines for a list cell', () => {
    expect(describeLines([])).toBe('');
    expect(describeLines([{ name: 'ייעוץ', quantity: 1 }])).toBe('ייעוץ');
    expect(describeLines([{ name: 'ייעוץ', quantity: 1 }, { name: 'רישוי', quantity: 1 }])).toBe('ייעוץ +1');
  });
});

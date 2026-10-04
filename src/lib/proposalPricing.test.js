import { describe, it, expect } from 'vitest';
import {
  PROPOSAL_STATUSES, PROPOSAL_COMPLEXITIES, proposalStatusMeta, complexityMeta,
  complexityLabel, getAdjustedRate, computePricing, VAT_RATE, nextVersion, approvalMissing,
} from './proposalPricing';
import { TONES, normalizeTone, surfaceFor } from './tones';
import { EN } from './i18n/dictionary';

describe('a proposal status is declared like every other status', () => {
  it('carries a value, a Hebrew label and a tone the tone map knows', () => {
    for (const status of PROPOSAL_STATUSES) {
      expect(status.value, JSON.stringify(status)).toBeTruthy();
      expect(status.label, status.value).toBeTruthy();
      expect(TONES, status.value).toContain(normalizeTone(status.tone));
    }
  });

  it('renders through the one tone map — never its own colours', () => {
    const classes = PROPOSAL_STATUSES.map((s) => surfaceFor(s.tone)).join(' ');
    expect(classes).not.toMatch(/\b(?:red|green|blue|yellow|orange|purple|gray|grey|slate|zinc)-\d/);
  });

  it('answers for an unknown status rather than rendering a blank chip', () => {
    expect(proposalStatusMeta('not-a-status')).toBe(PROPOSAL_STATUSES[0]);
    expect(proposalStatusMeta(undefined).label).toBeTruthy();
  });
});

// These labels reach t() through a variable, so the missing-string scan cannot
// see them. Without this, the quote module reads half-English.
describe('every label this module renders is translatable', () => {
  it('has an English entry for each status and each complexity tier', () => {
    for (const { label } of [...PROPOSAL_STATUSES, ...PROPOSAL_COMPLEXITIES]) {
      expect(EN[label], `"${label}" has no English`).toBeTruthy();
    }
  });
});

describe('complexity is one list, not a label map beside a multiplier map', () => {
  it('names every tier it prices', () => {
    for (const tier of PROPOSAL_COMPLEXITIES) {
      expect(tier.label, tier.value).toBeTruthy();
      expect(tier.multiplier, tier.value).toBeGreaterThan(0);
      // The label a picker shows is derived, so a tier cannot be priced and unnamed.
      expect(complexityLabel(tier.value)).toContain(String(tier.multiplier));
    }
  });

  it('falls back to the base tier for a value it does not know', () => {
    expect(complexityMeta('galactic')).toBe(PROPOSAL_COMPLEXITIES[0]);
    expect(getAdjustedRate(300, 'galactic')).toBe(300);
  });

  it('applies the tier to the hourly rate', () => {
    expect(getAdjustedRate(300, 'basic')).toBe(300);
    expect(getAdjustedRate(300, 'medium')).toBe(375);
    expect(getAdjustedRate(300, 'enterprise')).toBe(600);
  });
});

describe('what a proposal comes to', () => {
  const proposal = {
    base_hourly_rate: 400,
    complexity: 'medium', // x1.25 → 500/hour
    line_items: [{ name: 'אפיון', hours: 10 }, { name: 'פיתוח', hours: 20 }],
    discount_percent: 10,
    vat_percent: VAT_RATE,
  };

  it('discounts before VAT, which is the order an accountant checks', () => {
    const pricing = computePricing(proposal);
    expect(pricing.adjustedRate).toBe(500);
    expect(pricing.subtotal).toBe(15000);
    expect(pricing.discountAmount).toBe(1500);
    expect(pricing.afterDiscount).toBe(13500);
    expect(pricing.vatAmount).toBe(Math.round(13500 * 0.18));
    expect(pricing.finalTotal).toBe(13500 + Math.round(13500 * 0.18));
  });

  it('prices an empty proposal at zero instead of NaN', () => {
    const pricing = computePricing({});
    expect(pricing.subtotal).toBe(0);
    expect(pricing.finalTotal).toBe(0);
  });
});

describe('a new version keeps the old price on file', () => {
  const original = {
    id: 'p1', proposal_number: 'Q-2026-001', status: 'approved', signed_by: 'דנה', signed_date: '2026-01-01',
    client_name: 'אקמה', line_items: [{ name: 'א', hours: 3 }], created_date: 'x',
  };

  it('copies the quote as a draft, numbered as the next version, signature cleared', () => {
    const v2 = nextVersion(original);
    expect(v2.id).toBeUndefined();
    expect(v2.created_date).toBeUndefined();
    expect(v2.status).toBe('draft');
    expect(v2.version).toBe(2);
    expect(v2.proposal_number).toBe('Q-2026-001-v2');
    expect(v2.signed_by).toBeUndefined();
    expect(v2.root_id).toBe('p1');
    expect(v2.line_items).toEqual(original.line_items);
  });

  it('numbers from the whole family, not from the version it was copied from', () => {
    const v2 = { ...nextVersion(original), id: 'p2' };
    const v3 = { ...nextVersion(v2, [original]), id: 'p3' };
    // Branching off v2 again while v3 exists must give v4, not a second v3.
    const again = nextVersion(v2, [original, v3]);
    expect(v3.version).toBe(3);
    expect(v3.proposal_number).toBe('Q-2026-001-v3');
    expect(again.version).toBe(4);
  });
});

describe('approved means somebody on the customer side signed off', () => {
  it('refuses an approval with no signatory, and accepts one with', () => {
    expect(approvalMissing({ status: 'approved' })).toBeTruthy();
    expect(approvalMissing({ status: 'approved', signed_by: '  ' })).toBeTruthy();
    expect(approvalMissing({ status: 'approved', signed_by: 'דנה' })).toBeNull();
    expect(approvalMissing({ status: 'sent' })).toBeNull();
    expect(EN[approvalMissing({ status: 'approved' })]).toBeTruthy();
  });
});

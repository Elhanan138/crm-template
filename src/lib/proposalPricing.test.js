import { describe, it, expect } from 'vitest';
import {
  PROPOSAL_STATUSES, PROPOSAL_COMPLEXITIES, proposalStatusMeta, complexityMeta,
  complexityLabel, getAdjustedRate, computePricing, VAT_RATE,
} from './proposalPricing';
import { TONES, normalizeTone, surfaceFor } from './tones';

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

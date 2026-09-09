import { APP_IDENTITY } from '@/lib/appIdentity';
// Proposal pricing calculation engine.
// Single source of truth for all proposal price calculations.

export const COMPLEXITY_MULTIPLIERS = {
  basic: 1.0,
  medium: 1.25,
  advanced: 1.5,
  enterprise: 2.0,
};

export const COMPLEXITY_LABELS = {
  basic: 'בסיסי (x1.0)',
  medium: 'בינוני (x1.25)',
  advanced: 'מתקדם (x1.5)',
  enterprise: 'ארגוני (x2.0)',
};

export const STATUS_LABELS = {
  draft: 'טיוטה',
  sent: 'נשלחה',
  approved: 'אושרה',
  rejected: 'נדחתה',
};

export const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-success-muted text-success',
  rejected: 'bg-red-100 text-red-700',
};

export const VAT_RATE = 18;

/**
 * Compute the adjusted hourly rate for a given complexity.
 */
export function getAdjustedRate(baseHourlyRate, complexity) {
  const multiplier = COMPLEXITY_MULTIPLIERS[complexity] || 1.0;
  return Math.round((baseHourlyRate || 0) * multiplier);
}

/**
 * Compute the full pricing breakdown for a proposal.
 * Returns: { lineItems, subtotal, discountAmount, afterDiscount, vatAmount, finalTotal }
 */
export function computePricing({ base_hourly_rate = 0, complexity = 'basic', line_items = [], discount_percent = 0, vat_percent = VAT_RATE }) {
  const adjustedRate = getAdjustedRate(base_hourly_rate, complexity);

  const computedItems = (line_items || []).map((item) => {
    const rate = item.adjusted_rate ?? adjustedRate;
    const hours = Number(item.hours) || 0;
    return {
      ...item,
      adjusted_rate: rate,
      total: Math.round(hours * rate),
    };
  });

  const subtotal = computedItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Math.round(subtotal * ((Number(discount_percent) || 0) / 100));
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = Math.round(afterDiscount * ((Number(vat_percent) || 0) / 100));
  const finalTotal = afterDiscount + vatAmount;

  return {
    adjustedRate,
    lineItems: computedItems,
    subtotal,
    discountAmount,
    afterDiscount,
    vatAmount,
    finalTotal,
  };
}

/**
 * Generate the next proposal number, prefixed with the product name when set
 * (e.g. ACME-2026-001) and with a neutral Q- prefix on a blank template.
 */
export function generateProposalNumber(existingCount = 0) {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(3, '0');
  const prefix = (APP_IDENTITY.name || 'Q').replace(/\s+/g, '').toUpperCase();
  return `${prefix}-${year}-${seq}`;
}

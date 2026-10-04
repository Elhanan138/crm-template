import { APP_IDENTITY } from '@/lib/appIdentity';
// Proposal pricing calculation engine.
// Single source of truth for all proposal price calculations.

// A status is a value, a Hebrew label and what it MEANS — the same three-part
// shape every schema in src/lib/crm uses, so a proposal status renders through
// the one StatusBadge and the one tone→classes map in src/lib/tones.js.
//
// It used to be two parallel objects, one of them holding raw palette classes
// (`bg-blue-100`): a colour the design system bans, in the one file the lint
// rule did not look at.
export const PROPOSAL_STATUSES = [
  { value: 'draft', label: 'טיוטה', tone: 'muted' },
  { value: 'sent', label: 'נשלחה', tone: 'info' },
  { value: 'approved', label: 'אושרה', tone: 'success' },
  { value: 'rejected', label: 'נדחתה', tone: 'destructive' },
];

export const proposalStatusMeta = (value) =>
  PROPOSAL_STATUSES.find((s) => s.value === value) || PROPOSAL_STATUSES[0];

// Complexity was a label map and a multiplier map keyed by the same four ids —
// two lists that could drift. The multiplier is the definition; the label is
// derived from it, so a new tier cannot arrive priced but unnamed.
export const PROPOSAL_COMPLEXITIES = [
  { value: 'basic', label: 'בסיסי', multiplier: 1.0 },
  { value: 'medium', label: 'בינוני', multiplier: 1.25 },
  { value: 'advanced', label: 'מתקדם', multiplier: 1.5 },
  { value: 'enterprise', label: 'ארגוני', multiplier: 2.0 },
];

export const complexityMeta = (value) =>
  PROPOSAL_COMPLEXITIES.find((c) => c.value === value) || PROPOSAL_COMPLEXITIES[0];

/** The label a picker shows: the tier and what it does to the rate. */
export const complexityLabel = (value) => {
  const meta = complexityMeta(value);
  return `${meta.label} (x${meta.multiplier})`;
};

export const VAT_RATE = 18;

/**
 * Compute the adjusted hourly rate for a given complexity.
 */
export function getAdjustedRate(baseHourlyRate, complexity) {
  return Math.round((baseHourlyRate || 0) * complexityMeta(complexity).multiplier);
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

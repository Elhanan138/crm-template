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

/**
 * A new version of a quote — the next draft in a negotiation.
 *
 * A quote used to be edited in place, so the price the customer saw on
 * Monday was overwritten by Wednesday's and nobody could say what changed.
 * A version is a copy: same customer, same lines, the number suffixed, status
 * back to draft, the signature cleared — and a link to the first version so
 * the whole negotiation can be read in order.
 */
/** Today as a calendar day in local time — toISOString() is UTC, a day off after midnight. */
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function nextVersion(proposal, siblings = []) {
  const rootId = proposal.root_id || proposal.id;
  const family = [proposal, ...siblings].filter((p) => (p.root_id || p.id) === rootId);
  const version = Math.max(1, ...family.map((p) => Number(p.version) || 1)) + 1;
  const base = String(proposal.proposal_number || '').replace(/-v\d+$/, '');
  const { id: _id, created_date: _c, updated_date: _u, signed_by: _s, signed_date: _d, ...rest } = proposal;
  return {
    ...rest,
    root_id: rootId,
    version,
    proposal_number: base ? `${base}-v${version}` : '',
    status: 'draft',
    issue_date: localToday(),
  };
}

/**
 * Why a quote cannot be marked approved as it stands, or null.
 *
 * "Approved" with nobody's name on it is a status, not an agreement. The
 * customer-side signatory is what makes it one — and it is what the invoice
 * hand-off rests on.
 */
export const approvalMissing = (proposal) =>
  proposal?.status === 'approved' && !String(proposal.signed_by || '').trim()
    ? 'הצעה מאושרת צריכה שם של מאשר מטעם הלקוח'
    : null;

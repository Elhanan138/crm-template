import { num } from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// APPROVALS
//
// "Approved by" was a free field on a purchase order: anyone could move a
// ₪200,000 order straight from draft to ordered and leave it blank. A field
// nobody has to fill is a note, not a control.
//
// A schema declares its rule once:
//
//   approval: {
//     amountField:   'amount',          the figure the threshold applies to
//     approverField: 'approved_by',     who signed it off
//     threshold:     5000,              at or above this, a signature is needed
//     statuses:      ['ordered', …],    the states that require it
//   }
//
// and it is enforced at the one place every write passes through — the save
// in useCrmRecords — so the form, an inline cell and a bulk status change all
// meet the same rule. A check that lives only in the form is a check the bulk
// bar walks straight past.
// ─────────────────────────────────────────────────────────────────────────────

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

/**
 * Why a record may not be saved as it stands, or null when it may.
 *
 * `record` is the record AFTER the change: a patch is merged onto the stored
 * row by the caller, so a status change alone is judged against the amount
 * already on file.
 */
export function approvalProblem(schema, record) {
  const rule = schema?.approval;
  if (!rule || !record) return null;
  if (!rule.statuses.includes(record.status)) return null;
  if (num(record[rule.amountField]) < num(rule.threshold)) return null;
  if (!isBlank(record[rule.approverField])) return null;
  return {
    field: rule.approverField,
    threshold: rule.threshold,
    message: 'נדרש אישור לפני ההזמנה — סכום מעל סף האישור',
  };
}

/** The error thrown by a save the rule refuses. Its message is the reason. */
export class ApprovalRequiredError extends Error {
  constructor(problem) {
    super(problem.message);
    this.name = 'ApprovalRequiredError';
    this.field = problem.field;
  }
}

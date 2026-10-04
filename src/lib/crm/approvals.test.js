import { describe, it, expect } from 'vitest';
import { approvalProblem, ApprovalRequiredError } from './approvals';
import { CRM_SCHEMAS } from './schemas';
import { EN } from '../i18n/dictionary';

const schema = CRM_SCHEMAS.purchasing;
const order = (over) => ({ number: 'PO-1', supplier: 'ספק', amount: 20000, status: 'draft', ...over });

describe('a purchase order over the threshold needs a signature', () => {
  it('refuses to be ordered, approved or received without one', () => {
    for (const status of ['approved', 'ordered', 'received']) {
      const problem = approvalProblem(schema, order({ status }));
      expect(problem, status).not.toBeNull();
      expect(problem.field).toBe('approved_by');
    }
  });

  it('goes through once somebody has signed it off', () => {
    expect(approvalProblem(schema, order({ status: 'ordered', approved_by: 'דנה' }))).toBeNull();
  });

  it('treats whitespace as no signature at all', () => {
    expect(approvalProblem(schema, order({ status: 'ordered', approved_by: '   ' }))).not.toBeNull();
  });

  it('leaves a draft alone — there is nothing to approve yet', () => {
    expect(approvalProblem(schema, order({ status: 'draft' }))).toBeNull();
    expect(approvalProblem(schema, order({ status: 'cancelled' }))).toBeNull();
  });

  it('applies AT the threshold, not only above it', () => {
    const at = schema.approval.threshold;
    expect(approvalProblem(schema, order({ status: 'ordered', amount: at }))).not.toBeNull();
    expect(approvalProblem(schema, order({ status: 'ordered', amount: at - 1 }))).toBeNull();
  });

  it('is silent for a module that declares no rule', () => {
    expect(approvalProblem(CRM_SCHEMAS.leads, { status: 'won', value: 10 ** 9 })).toBeNull();
    expect(approvalProblem(undefined, order({}))).toBeNull();
  });

  it('names a field the schema actually has, and speaks English too', () => {
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toContain(schema.approval.approverField);
    expect(keys).toContain(schema.approval.amountField);
    const statuses = schema.fields.find((f) => f.key === 'status').options.map((o) => o.value);
    for (const s of schema.approval.statuses) expect(statuses).toContain(s);
    expect(EN[approvalProblem(schema, order({ status: 'ordered' })).message]).toBeTruthy();
  });

  it('throws an error whose message is the reason', () => {
    const err = new ApprovalRequiredError(approvalProblem(schema, order({ status: 'ordered' })));
    expect(err).toBeInstanceOf(Error);
    expect(err.field).toBe('approved_by');
  });
});

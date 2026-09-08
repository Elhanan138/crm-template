import { describe, it, expect } from 'vitest';
import {
  readField, isDerived, withDerived, withDerivedRows,
  invoiceBalance, invoiceOverdueDays, weightedValue, monthlyRevenue,
  stockValue, stockState, riskScore, riskBand, slaState, warrantyState,
  marginPercent, daysSince, daysUntil, yearsSince,
} from './derived';
import { CRM_SCHEMAS, LEAD_STAGES } from './schemas';
import { BILLING_CYCLES } from './sectorSchemas';

// A LOCAL calendar day. Building this through toISOString() shifts the date
// east of Greenwich once the clock passes midnight, which made these tests
// pass by day and fail at night.
const dayString = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const iso = dayString;

describe('date helpers', () => {
  it('measure in both directions and refuse to guess', () => {
    expect(daysSince(iso(-3))).toBe(3);
    expect(daysUntil(iso(5))).toBe(5);
    expect(daysSince(null)).toBeNull();
    expect(daysUntil('not a date')).toBeNull();
    // Tenure rounds DOWN: you do not have two years until you have them.
    expect(yearsSince(iso(-365 * 2))).toBe(1.9);
    expect(yearsSince(iso(-366 * 2))).toBe(2);
  });
});

describe('invoice balance', () => {
  it('is gross of VAT and net of what came in', () => {
    expect(invoiceBalance({ amount: 1000, vat_percent: 18, paid_amount: 0 })).toBe(1180);
    expect(invoiceBalance({ amount: 1000, vat_percent: 18, paid_amount: 180 })).toBe(1000);
  });

  it('never goes negative when someone overpays', () => {
    expect(invoiceBalance({ amount: 100, paid_amount: 500 })).toBe(0);
  });

  it('counts lateness only while money is still owed', () => {
    expect(invoiceOverdueDays({ amount: 100, due_date: iso(-10), status: 'sent' })).toBe(10);
    expect(invoiceOverdueDays({ amount: 100, due_date: iso(10), status: 'sent' })).toBeNull();
    expect(invoiceOverdueDays({ amount: 100, paid_amount: 200, due_date: iso(-10), status: 'paid' })).toBeNull();
    expect(invoiceOverdueDays({ amount: 100, due_date: iso(-10), status: 'void' })).toBeNull();
  });
});

describe('weighted pipeline', () => {
  const weigh = weightedValue(LEAD_STAGES);

  it('discounts a deal by the probability its stage declares', () => {
    expect(weigh({ value: 10000, stage: 'qualified' })).toBe(2500);
    expect(weigh({ value: 10000, stage: 'won' })).toBe(10000);
    expect(weigh({ value: 10000, stage: 'lost' })).toBe(0);
  });

  it('is zero for an unknown stage rather than the full value', () => {
    expect(weigh({ value: 10000, stage: 'nonsense' })).toBe(0);
    expect(weigh({ stage: 'won' })).toBe(0);
  });
});

describe('recurring revenue', () => {
  const mrr = monthlyRevenue(BILLING_CYCLES);

  it('normalises every billing cycle to one month', () => {
    expect(mrr({ amount: 1200, billing_cycle: 'yearly', status: 'active' })).toBe(100);
    expect(mrr({ amount: 300, billing_cycle: 'quarterly', status: 'active' })).toBe(100);
    expect(mrr({ amount: 100, billing_cycle: 'monthly', status: 'active' })).toBe(100);
  });

  it('drops to zero once a customer has churned', () => {
    expect(mrr({ amount: 1200, billing_cycle: 'monthly', status: 'churned' })).toBe(0);
  });
});

describe('stock', () => {
  it('values the shelf and names its state', () => {
    expect(stockValue({ quantity: 12, unit_cost: 25 })).toBe(300);
    expect(stockState({ quantity: 0 })).toBe('out');
    expect(stockState({ quantity: 3, reorder_point: 5 })).toBe('low');
    expect(stockState({ quantity: 30, reorder_point: 5 })).toBe('ok');
    // No reorder point declared is not the same as being below it.
    expect(stockState({ quantity: 1 })).toBe('ok');
  });
});

describe('risk register', () => {
  it('scores likelihood x impact and bands it', () => {
    expect(riskScore({ likelihood: 4, impact: 5 })).toBe(20);
    expect(riskBand({ likelihood: 1, impact: 2 })).toBe('low');
    expect(riskBand({ likelihood: 3, impact: 3 })).toBe('medium');
    expect(riskBand({ likelihood: 3, impact: 4 })).toBe('high');
    expect(riskBand({ likelihood: 5, impact: 5 })).toBe('critical');
  });
});

describe('service level', () => {
  it('judges an open call against today and a closed one against when it closed', () => {
    expect(slaState({ status: 'open', sla_due: iso(3) })).toBe('open');
    expect(slaState({ status: 'open', sla_due: iso(-3) })).toBe('breached');
    expect(slaState({ status: 'done', sla_due: iso(-3), completed_date: iso(-5) })).toBe('met');
    expect(slaState({ status: 'done', sla_due: iso(-5), completed_date: iso(-3) })).toBe('breached');
    expect(slaState({ status: 'open' })).toBe('none');
  });
});

describe('warranty', () => {
  it('warns before it lapses, not after', () => {
    expect(warrantyState({ warranty_until: iso(400) })).toBe('valid');
    expect(warrantyState({ warranty_until: iso(30) })).toBe('ending');
    expect(warrantyState({ warranty_until: iso(-1) })).toBe('expired');
    expect(warrantyState({})).toBe('none');
  });
});

describe('margin', () => {
  it('is a percentage of price, and undefined without a price', () => {
    expect(marginPercent({ list_price: 200, cost: 50 })).toBe(75);
    expect(marginPercent({ list_price: 0, cost: 50 })).toBeNull();
    expect(marginPercent({ cost: 50 })).toBeNull();
  });
});

describe('field access', () => {
  it('computes a derived field and reads a stored one', () => {
    const field = { key: 'x', derive: (r) => r.a + r.b };
    expect(readField(field, { a: 1, b: 2 })).toBe(3);
    expect(readField({ key: 'a' }, { a: 7 })).toBe(7);
    expect(isDerived(field)).toBe(true);
    expect(isDerived({ key: 'a' })).toBe(false);
  });

  it('materialises derived values onto a row without touching the original', () => {
    const record = { amount: 1000, vat_percent: 18, paid_amount: 0, status: 'sent' };
    const row = withDerived(CRM_SCHEMAS.invoices, record);
    expect(row.balance).toBe(1180);
    expect(record.balance).toBeUndefined();
  });

  it('leaves a schema with no derived fields exactly as it was', () => {
    const rows = [{ a: 1 }];
    expect(withDerivedRows({ fields: [{ key: 'a' }] }, rows)[0]).toBe(rows[0]);
    expect(withDerivedRows(undefined, rows)[0]).toBe(rows[0]);
  });
});

describe('the schemas actually wire them up', () => {
  const derivedIn = (id) => CRM_SCHEMAS[id].fields.filter(isDerived).map((f) => f.key);

  it('gives each module the number its domain is read by', () => {
    expect(derivedIn('leads')).toContain('weighted_value');
    expect(derivedIn('invoices')).toEqual(expect.arrayContaining(['balance', 'overdue_days']));
    expect(derivedIn('products')).toContain('margin_percent');
    expect(derivedIn('subscriptions')).toContain('mrr');
    expect(derivedIn('inventory')).toEqual(expect.arrayContaining(['stock_value', 'stock_state']));
    expect(derivedIn('risks')).toEqual(expect.arrayContaining(['risk_score', 'risk_band']));
    expect(derivedIn('maintenance')).toContain('sla_state');
    expect(derivedIn('assets')).toContain('warranty_state');
    expect(derivedIn('employees')).toContain('tenure_years');
    expect(derivedIn('recruiting')).toContain('days_in_stage');
    expect(derivedIn('training')).toContain('days_left');
    expect(derivedIn('purchasing')).toContain('delivery_days_left');
  });

  it('never marks a derived field required — there is nothing to fill in', () => {
    for (const schema of Object.values(CRM_SCHEMAS)) {
      for (const field of schema.fields.filter(isDerived)) {
        expect(field.required, `${field.key} is derived and required`).toBeFalsy();
        expect(field.default, `${field.key} is derived and has a default`).toBeUndefined();
      }
    }
  });

  it('survives an empty record without throwing', () => {
    for (const [id, schema] of Object.entries(CRM_SCHEMAS)) {
      for (const field of schema.fields.filter(isDerived)) {
        expect(() => field.derive({}), `${id}.${field.key}`).not.toThrow();
      }
    }
  });
});

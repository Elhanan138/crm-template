import { describe, it, expect } from 'vitest';
import {
  AUTOMATION_TEMPLATES, AUTOMATION_SUBJECTS, AUTOMATION_EVENTS, AUTOMATION_ACTIONS,
  CONDITION_OPERATORS, RUN_MODES, subjectMeta,
} from './schemas';
import { MODULE_IDS } from '@/lib/modules';
import { conditionHolds, previewRule } from '@/api/automationRunner';
import { EN } from '../i18n/dictionary';

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('every library rule is a rule the builder could have written', () => {
  it.each(AUTOMATION_TEMPLATES.map((t) => [t.id, t]))('%s', (_id, tpl) => {
    expect(MODULE_IDS).toContain(tpl.module);
    const subject = subjectMeta(tpl.subject);
    expect(subject, `unknown subject ${tpl.subject}`).toBeTruthy();
    const fields = subject.fields.map((f) => f.key);
    const event = AUTOMATION_EVENTS.find((e) => e.value === tpl.event);
    expect(event, tpl.event).toBeTruthy();
    if (event.needsField) expect(fields, `${tpl.id} trigger field`).toContain(tpl.field);
    if (event.needsDays) expect(Number.isFinite(Number(tpl.days))).toBe(true);
    for (const c of tpl.conditions) {
      expect(fields, `${tpl.id} condition field`).toContain(c.field);
      expect(CONDITION_OPERATORS.map((o) => o.value)).toContain(c.operator);
    }
    expect(tpl.actions.length).toBeGreaterThan(0);
    for (const a of tpl.actions) {
      const meta = AUTOMATION_ACTIONS.find((m) => m.value === a.type);
      expect(meta, a.type).toBeTruthy();
      if (meta.needsField) expect(fields).toContain(a.field);
      else expect(String(a.value || '').trim()).not.toBe('');
    }
    expect(EN[tpl.name], `"${tpl.name}" has no English`).toBeTruthy();
    expect(EN[tpl.description], `"${tpl.description}" has no English`).toBeTruthy();
  });

  it('has unique ids, so "already added" means one thing', () => {
    const ids = AUTOMATION_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the collection reminder actually catches an overdue invoice', () => {
  const tpl = AUTOMATION_TEMPLATES.find((t) => t.id === 'collect-overdue');
  const invoices = [
    { id: 'late', status: 'sent', due_date: day(-10) },
    { id: 'paid', status: 'paid', due_date: day(-10) },
    { id: 'recent', status: 'sent', due_date: day(-2) },
    { id: 'void', status: 'void', due_date: day(-30) },
  ];
  it('matches what is a week late and unpaid — and only that', () => {
    expect(previewRule(tpl, invoices).map((r) => r.id)).toEqual(['late']);
  });
});

// The builder saved `op`; the runner read `operator`. Every condition built in
// the interface evaluated to false, so any rule with a condition never fired.
describe('a condition saved by the builder is read by the runner', () => {
  it('understands the legacy `op` key a saved rule may still carry', () => {
    expect(conditionHolds({ stage: 'won' }, { field: 'stage', op: 'eq', value: 'won' })).toBe(true);
    expect(conditionHolds({ stage: 'won' }, { field: 'stage', op: 'neq', value: 'won' })).toBe(false);
  });

  it('prefers `operator` when both are present', () => {
    expect(conditionHolds({ a: 'x' }, { field: 'a', operator: 'eq', op: 'neq', value: 'x' })).toBe(true);
  });
});

describe('a dry run only counts', () => {
  const rule = { subject: 'Lead', event: 'created', conditions: [{ field: 'stage', operator: 'eq', value: 'new' }] };
  const leads = [
    { id: '1', stage: 'new', created_date: '2020-01-01T00:00:00Z' },
    { id: '2', stage: 'won', created_date: '2020-01-01T00:00:00Z' },
  ];
  it('looks at every record, however old, and changes nothing', () => {
    const before = JSON.stringify(leads);
    expect(previewRule(rule, leads).map((r) => r.id)).toEqual(['1']);
    expect(JSON.stringify(leads)).toBe(before);
  });
  it('answers for a rule with no subject', () => {
    expect(previewRule({}, leads)).toEqual([]);
  });
});

describe('a date-passed rule reads a calendar day as a local day', () => {
  it('does not fire a day early on an invoice due today', () => {
    const rule = { subject: 'Invoice', event: 'date_passed', field: 'due_date', days: 1, conditions: [] };
    expect(previewRule(rule, [{ id: 'x', due_date: day(0) }])).toEqual([]);
    expect(previewRule(rule, [{ id: 'y', due_date: day(-1) }]).map((r) => r.id)).toEqual(['y']);
  });
});

describe('the builder vocabulary speaks English', () => {
  it('has an entry for every subject, field, event, operator, action and mode', () => {
    const labels = [
      ...AUTOMATION_SUBJECTS.flatMap((s) => [s.label, ...s.fields.map((f) => f.label)]),
      ...AUTOMATION_EVENTS.map((e) => e.label),
      ...CONDITION_OPERATORS.map((o) => o.label),
      ...AUTOMATION_ACTIONS.flatMap((a) => [a.label, a.valueLabel]),
      ...RUN_MODES.map((m) => m.label),
    ].filter(Boolean);
    const missing = [...new Set(labels)].filter((l) => !EN[l]);
    expect(missing).toEqual([]);
  });
});

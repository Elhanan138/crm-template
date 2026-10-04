import { describe, it, expect } from 'vitest';
import {
  CUSTOM_FIELD_ENTITIES, conditionMet, isFieldVisible, visibleFields,
  pruneHiddenValues, validateCustomFields, validateVisibleCustomFields,
} from './customFields';
import { customFieldColumns } from './reports/registry';
import { CRM_SCHEMAS } from './crm/schemas';
import { ACTIVE_MODULE_IDS } from './moduleRegistry';

describe('which entities accept custom fields', () => {
  it('covers every schema-driven module in this build', () => {
    const values = CUSTOM_FIELD_ENTITIES.map((e) => e.value);
    for (const id of ACTIVE_MODULE_IDS) {
      if (!CRM_SCHEMAS[id]) continue;
      expect(values, `${id} should accept custom fields`).toContain(CRM_SCHEMAS[id].entity);
    }
  });

  it('keeps the three entities that predate the schema engine', () => {
    const values = CUSTOM_FIELD_ENTITIES.map((e) => e.value);
    for (const entity of ['Project', 'Task', 'SupportTicket']) expect(values).toContain(entity);
  });

  it('lists nothing twice', () => {
    const values = CUSTOM_FIELD_ENTITIES.map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('conditional visibility', () => {
  const fields = [
    { key: 'kind', label: 'סוג', type: 'select' },
    { key: 'other', label: 'פירוט אחר', type: 'text', visible_when: { field: 'kind', operator: 'eq', value: 'אחר' } },
    { key: 'amount', label: 'סכום', type: 'number', visible_when: { field: 'kind', operator: 'not_empty' } },
  ];

  it('shows a field with no rule, always', () => {
    expect(isFieldVisible(fields[0], {})).toBe(true);
    expect(isFieldVisible({ key: 'x' }, {})).toBe(true);
  });

  it('applies each operator the way the automations do', () => {
    expect(conditionMet({ field: 'a', operator: 'eq', value: 'x' }, { a: 'X' })).toBe(true);
    expect(conditionMet({ field: 'a', operator: 'neq', value: 'x' }, { a: 'y' })).toBe(true);
    expect(conditionMet({ field: 'a', operator: 'gt', value: '5' }, { a: 9 })).toBe(true);
    expect(conditionMet({ field: 'a', operator: 'lt', value: '5' }, { a: 9 })).toBe(false);
    expect(conditionMet({ field: 'a', operator: 'contains', value: 'ell' }, { a: 'hello' })).toBe(true);
    expect(conditionMet({ field: 'a', operator: 'empty' }, {})).toBe(true);
    expect(conditionMet({ field: 'a', operator: 'not_empty' }, { a: 'v' })).toBe(true);
  });

  it('treats an unticked checkbox as empty', () => {
    expect(conditionMet({ field: 'a', operator: 'empty' }, { a: false })).toBe(true);
    expect(conditionMet({ field: 'a', operator: 'not_empty' }, { a: false })).toBe(false);
  });

  it('reveals and hides as the values change', () => {
    expect(visibleFields(fields, {}).map((f) => f.key)).toEqual(['kind']);
    expect(visibleFields(fields, { kind: 'רגיל' }).map((f) => f.key)).toEqual(['kind', 'amount']);
    expect(visibleFields(fields, { kind: 'אחר' }).map((f) => f.key)).toEqual(['kind', 'other', 'amount']);
  });

  it('drops the answer to a question that disappeared', () => {
    const answered = { kind: 'אחר', other: 'הסבר', amount: 5 };
    expect(pruneHiddenValues(fields, answered)).toEqual(answered);

    const changed = { ...answered, kind: 'רגיל' };
    const pruned = pruneHiddenValues(fields, changed);
    expect(pruned.other).toBeUndefined();
    expect(pruned.amount).toBe(5);
  });

  it('keeps values that belong to no known field rather than silently losing them', () => {
    expect(pruneHiddenValues(fields, { kind: 'x', legacy: 'keep me' }).legacy).toBe('keep me');
  });

  it('does not demand a required answer to a hidden question', () => {
    const required = [
      { key: 'kind', label: 'סוג', type: 'select' },
      { key: 'other', label: 'פירוט', type: 'text', required: true, visible_when: { field: 'kind', operator: 'eq', value: 'אחר' } },
    ];
    expect(validateCustomFields(required, { kind: 'רגיל' })).toEqual(['פירוט']);
    expect(validateVisibleCustomFields(required, { kind: 'רגיל' })).toEqual([]);
    expect(validateVisibleCustomFields(required, { kind: 'אחר' })).toEqual(['פירוט']);
  });
});

describe('custom fields as report columns', () => {
  const custom = [
    { entity: 'Lead', key: 'field_a', label: 'מקור מפורט', type: 'select' },
    { entity: 'Lead', key: 'field_b', label: 'הערה ארוכה', type: 'textarea' },
    { entity: 'Invoice', key: 'field_c', label: 'מספר הזמנה', type: 'number' },
  ];

  it('only takes the fields belonging to that entity', () => {
    expect(customFieldColumns('Lead', custom).map((c) => c.label)).toEqual(['מקור מפורט']);
    expect(customFieldColumns('Invoice', custom).map((c) => c.label)).toEqual(['מספר הזמנה']);
    expect(customFieldColumns('Asset', custom)).toEqual([]);
  });

  it('applies the same column rules a declared field would get', () => {
    const [select] = customFieldColumns('Lead', custom);
    expect(select.groupable).toBe(true);
    const [number] = customFieldColumns('Invoice', custom);
    expect(number.aggregatable).toBe(true);
    expect(number.type).toBe('number');
  });

  it('addresses the value where it is actually stored', () => {
    expect(customFieldColumns('Lead', custom)[0].key).toBe('custom_fields.field_a');
  });
});

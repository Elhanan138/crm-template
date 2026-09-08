import { describe, it, expect } from 'vitest';
import {
  statsFor, segmentsFor, groupOptionsFor, boardConfigFor, sortRecords,
  groupRecords, toCsv, isOverdue, statusFieldOf, moneyFieldOf, deadlineFieldOf,
} from './insights';

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

const STATUSES = [
  { value: 'draft', label: 'טיוטה', tone: 'muted' },
  { value: 'sent', label: 'נשלחה', tone: 'info' },
  { value: 'overdue', label: 'באיחור', tone: 'destructive' },
  { value: 'paid', label: 'שולמה', tone: 'success' },
];

const schema = {
  title: 'חשבוניות',
  titleField: 'number',
  fields: [
    { key: 'number', label: 'מספר', type: 'text', list: true },
    { key: 'client_name', label: 'לקוח', type: 'text', list: true },
    { key: 'status', label: 'סטטוס', type: 'select', options: STATUSES, list: true },
    { key: 'amount', label: 'סכום', type: 'currency', list: true },
    { key: 'due_date', label: 'מועד תשלום', type: 'date', list: true },
    { key: 'owner_email', label: 'אחראי', type: 'person', by: 'email' },
    { key: 'notes', label: 'הערות', type: 'textarea' },
  ],
};

const rows = [
  { id: '1', number: 'A-1', client_name: 'בלוסום', status: 'sent', amount: 1000, due_date: iso(-5), owner_email: 'me@x.co' },
  { id: '2', number: 'A-2', client_name: 'אקמה', status: 'paid', amount: 5000, due_date: iso(-30), owner_email: 'other@x.co' },
  { id: '3', number: 'A-3', client_name: 'בלוסום', status: 'overdue', amount: 250, due_date: iso(-1), owner_email: 'other@x.co' },
  { id: '4', number: 'A-4', client_name: 'אקמה', status: 'draft', amount: null, due_date: iso(10), owner_email: 'me@x.co' },
];

// Mirrors formatValue from useCrmRecords: a select renders as its label, which
// is what the grouping headers show and order themselves by.
const fmt = (field, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (field?.type === 'select') {
    return field.options?.find((o) => String(o.value) === String(value))?.label ?? String(value);
  }
  return String(value);
};

describe('field derivation', () => {
  it('picks the status, money and deadline fields out of the schema', () => {
    expect(statusFieldOf(schema).key).toBe('status');
    expect(moneyFieldOf(schema).key).toBe('amount');
    expect(deadlineFieldOf(schema).key).toBe('due_date');
  });

  it('returns nothing rather than guessing when a schema has no such field', () => {
    const bare = { title: 'פתקים', fields: [{ key: 'text', label: 'טקסט', type: 'text' }] };
    expect(statusFieldOf(bare)).toBeNull();
    expect(moneyFieldOf(bare)).toBeNull();
    expect(deadlineFieldOf(bare)).toBeNull();
  });
});

describe('overdue', () => {
  it('is late only when the date has passed AND the record is still open', () => {
    expect(isOverdue(schema, rows[0])).toBe(true);
    // paid — a closed record cannot be late, however old its due date is
    expect(isOverdue(schema, rows[1])).toBe(false);
    expect(isOverdue(schema, rows[3])).toBe(false);
    expect(isOverdue(schema, { status: 'sent' })).toBe(false);
  });

  it('treats a dead-end status as closed, but never an opening one', () => {
    // Both wear the muted tone; only one of them is finished.
    expect(isOverdue(schema, { status: 'draft', due_date: iso(-9) })).toBe(true);
    expect(isOverdue({ ...schema, fields: schema.fields }, { status: 'void', due_date: iso(-9) })).toBe(false);
  });
});

describe('statsFor', () => {
  it('totals only what is still open, and counts what needs attention', () => {
    const stats = statsFor(schema, rows, { formatCurrency: (n) => `₪${n}` });
    expect(stats).toHaveLength(4);
    expect(stats[0].value).toBe('4');
    // 1000 + 250 + 0 — the paid 5000 is excluded
    expect(stats[1].value).toBe('₪1250');
    expect(stats[2]).toMatchObject({ label: 'דורש טיפול', value: '1', alert: true });
    expect(stats[3]).toMatchObject({ value: '2', alert: true });
  });

  it('says nothing on an empty module rather than showing a row of zeroes', () => {
    expect(statsFor(schema, [])).toEqual([]);
  });

  it('still gives a second number to a module with no money, status or date', () => {
    const bare = { title: 'פתקים', fields: [{ key: 'text', label: 'טקסט', type: 'text' }] };
    const stats = statsFor(bare, [{ id: '1', created_date: new Date().toISOString() }]);
    expect(stats).toHaveLength(2);
    expect(stats[1].label).toBe('נוספו החודש');
  });
});

describe('segmentsFor', () => {
  const segments = segmentsFor(schema, { myEmail: 'me@x.co' });
  const bySeg = (id) => rows.filter(segments.find((s) => s.id === id).test);

  it('offers only the segments the schema can actually support', () => {
    expect(segments.map((s) => s.id)).toEqual(['all', 'open', 'mine', 'attention', 'overdue', 'soon']);
    const bare = { fields: [{ key: 'text', label: 'טקסט', type: 'text' }] };
    expect(segmentsFor(bare, {}).map((s) => s.id)).toEqual(['all']);
  });

  it('slices the rows the way each label promises', () => {
    expect(bySeg('all')).toHaveLength(4);
    expect(bySeg('open').map((r) => r.id)).toEqual(['1', '3', '4']);
    expect(bySeg('mine').map((r) => r.id)).toEqual(['1', '4']);
    expect(bySeg('attention').map((r) => r.id)).toEqual(['3']);
    expect(bySeg('overdue').map((r) => r.id)).toEqual(['1', '3']);
    expect(bySeg('soon').map((r) => r.id)).toEqual(['4']);
  });
});

describe('sortRecords', () => {
  it('sorts numbers numerically and dates chronologically', () => {
    expect(sortRecords(rows, { key: 'amount', dir: 'desc' }, schema).map((r) => r.id)[0]).toBe('2');
    expect(sortRecords(rows, { key: 'due_date', dir: 'asc' }, schema).map((r) => r.id)[0]).toBe('2');
  });

  it('sorts a status by the order the schema declares, not alphabetically', () => {
    expect(sortRecords(rows, { key: 'status', dir: 'asc' }, schema).map((r) => r.status))
      .toEqual(['draft', 'sent', 'overdue', 'paid']);
  });

  it('sinks empty values to the bottom in both directions', () => {
    expect(sortRecords(rows, { key: 'amount', dir: 'asc' }, schema).map((r) => r.id).at(-1)).toBe('4');
    expect(sortRecords(rows, { key: 'amount', dir: 'desc' }, schema).map((r) => r.id).at(-1)).toBe('4');
  });

  it('leaves the order alone when nothing is sorted, without mutating the input', () => {
    const before = rows.map((r) => r.id);
    expect(sortRecords(rows, { key: null }, schema)).toBe(rows);
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe('grouping', () => {
  it('offers groupable fields and skips free text and money', () => {
    expect(groupOptionsFor(schema).map((o) => o.key)).toEqual(['client_name', 'status', 'owner_email']);
  });

  it('buckets rows and keeps the schema option order', () => {
    const groups = groupRecords(rows, 'status', schema, fmt);
    expect(groups.map((g) => g.label)).toEqual(['טיוטה', 'נשלחה', 'באיחור', 'שולמה']);
    expect(groups[0].items).toHaveLength(1);
  });

  it('returns null when nothing is grouped', () => {
    expect(groupRecords(rows, '', schema, fmt)).toBeNull();
  });

  it('does not list one customer twice because it was spelled two ways', () => {
    const spellings = [
      { id: 'a', client_name: 'בלוסום בע"מ', amount: 100 },
      { id: 'b', client_name: 'בלוסום בעמ', amount: 200 },
      { id: 'c', client_name: 'אקמה', amount: 50 },
    ];
    const groups = groupRecords(spellings, 'client_name', schema, fmt);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.items.length === 2).label).toBe('בלוסום בע"מ');
  });
});

describe('boardConfigFor', () => {
  it('derives a board from a toned status field', () => {
    expect(boardConfigFor(schema)).toEqual({ field: 'status', stages: STATUSES });
  });

  it('lets a schema override the derived board', () => {
    const custom = { ...schema, boardField: 'client_name', boardStages: [{ value: 'x', label: 'X' }] };
    expect(boardConfigFor(custom).field).toBe('client_name');
  });

  it('offers no board when there is no status to put in columns', () => {
    expect(boardConfigFor({ fields: [{ key: 'a', type: 'text' }] })).toBeNull();
  });
});

describe('toCsv', () => {
  const columns = schema.fields.filter((f) => f.list);

  it('starts with a BOM so Excel reads Hebrew instead of mojibake', () => {
    expect(toCsv(rows, columns, fmt).startsWith('﻿')).toBe(true);
  });

  it('writes the labels as the header and one line per row', () => {
    const lines = toCsv(rows, columns, fmt).split('\r\n');
    expect(lines[0]).toBe('﻿מספר,לקוח,סטטוס,סכום,מועד תשלום');
    expect(lines).toHaveLength(5);
  });

  it('quotes values that would otherwise break the columns', () => {
    const csv = toCsv([{ number: 'A,1', client_name: 'שם "עם" מרכאות' }], columns, fmt);
    expect(csv).toContain('"A,1"');
    expect(csv).toContain('"שם ""עם"" מרכאות"');
  });
});

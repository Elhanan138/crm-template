import { describe, it, expect } from 'vitest';
import { resolveColumns, PAGE_SIZES, DEFAULT_PAGE_SIZE } from './tablePrefs';

const schema = {
  fields: [
    { key: 'name', label: 'שם', type: 'text', list: true },
    { key: 'status', label: 'סטטוס', type: 'select', list: true },
    { key: 'phone', label: 'טלפון', type: 'phone' },
    { key: 'notes', label: 'הערות', type: 'textarea' },
  ],
};

describe('column resolution', () => {
  it('falls back to the columns the schema lists', () => {
    expect(resolveColumns(schema, null).map((f) => f.key)).toEqual(['name', 'status']);
    expect(resolveColumns(schema, []).map((f) => f.key)).toEqual(['name', 'status']);
  });

  it('honours a saved choice, including a field the schema does not list', () => {
    expect(resolveColumns(schema, ['name', 'phone']).map((f) => f.key)).toEqual(['name', 'phone']);
  });

  it('keeps the saved order rather than the schema order', () => {
    expect(resolveColumns(schema, ['status', 'name']).map((f) => f.key)).toEqual(['status', 'name']);
  });

  it('drops keys that no longer exist instead of rendering an empty column', () => {
    expect(resolveColumns(schema, ['name', 'gone']).map((f) => f.key)).toEqual(['name']);
  });

  it('a selection that resolves to nothing falls back rather than emptying the table', () => {
    // Every saved field was renamed away — the table must still show something.
    expect(resolveColumns(schema, ['gone', 'also_gone']).map((f) => f.key)).toEqual(['name', 'status']);
  });

  it('survives a schema with no fields at all', () => {
    expect(resolveColumns(undefined, ['name'])).toEqual([]);
    expect(resolveColumns({ fields: [] }, null)).toEqual([]);
  });
});

describe('page sizes', () => {
  it('offers a default that is one of the options', () => {
    expect(PAGE_SIZES).toContain(DEFAULT_PAGE_SIZE);
    expect([...PAGE_SIZES].sort((a, b) => a - b)).toEqual(PAGE_SIZES);
  });
});

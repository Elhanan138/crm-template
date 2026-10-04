import { describe, it, expect } from 'vitest';
import { captureView, restoreView } from './savedViews';

const columns = [
  { key: 'name' },
  { key: 'stage', groupable: true },
  { key: 'owner', groupable: true },
  { key: 'value', aggregatable: true },
];

describe('a saved report survives the columns changing under it', () => {
  it('round-trips the builder state', () => {
    const state = captureView({
      visibleColumns: ['name', 'value'], groupBy: ['stage'], aggregateFields: ['value'],
      chartType: 'bar', filters: { stage: 'won' }, sortConfig: { key: 'value', direction: 'desc' },
    });
    expect(restoreView(state, columns)).toEqual(state);
  });

  it('drops a column renamed or removed since the view was saved', () => {
    const view = restoreView({ visibleColumns: ['name', 'gone'], filters: { gone: 'x', stage: 'won' } }, columns);
    expect(view.visibleColumns).toEqual(['name']);
    expect(view.filters).toEqual({ stage: 'won' });
  });

  it('shows every column rather than an empty table when none survive', () => {
    expect(restoreView({ visibleColumns: ['gone'] }, columns).visibleColumns).toEqual(['name', 'stage', 'owner', 'value']);
  });

  it('only groups by groupable columns, at most two deep', () => {
    expect(restoreView({ groupBy: ['name', 'stage', 'owner', 'value'] }, columns).groupBy).toEqual(['stage', 'owner']);
  });

  it('falls back on anything it cannot read', () => {
    const view = restoreView({ chartType: 'donut', sortConfig: { key: 'gone', direction: 'sideways' } }, columns);
    expect(view.chartType).toBe('pie');
    expect(view.sortConfig).toEqual({ key: null, direction: 'asc' });
    expect(restoreView(undefined, columns).groupBy).toEqual([]);
  });
});

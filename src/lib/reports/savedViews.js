// ─────────────────────────────────────────────────────────────────────────────
// SAVED REPORTS
//
// The report builder could group, aggregate, filter and chart — and forgot all
// of it the moment you left the page. A report someone has to rebuild every
// Monday is a report nobody reads on Tuesday.
//
// A saved view is the builder's state under a name, stored as an ordinary
// record (`SavedReport`) rather than in the browser: a report is something a
// team shares, and a browser preference cannot be shared. In a database it
// lands in app_record like every other entity without a schema.
//
// A view outlives the columns it names. A field renamed or removed since the
// view was saved is dropped on read rather than breaking the report, and a
// view that resolves to no columns at all falls back to every column.
// ─────────────────────────────────────────────────────────────────────────────

export const SAVED_REPORT_ENTITY = 'SavedReport';

const CHART_TYPES = ['pie', 'bar'];

/** The part of the builder's state worth keeping. */
export const captureView = ({ visibleColumns, groupBy, aggregateFields, chartType, filters, sortConfig }) => ({
  visibleColumns, groupBy, aggregateFields, chartType, filters, sortConfig,
});

/** A stored view, repaired against the columns this source has today. */
export function restoreView(state = {}, columns = []) {
  const known = new Set(columns.map((c) => c.key));
  const keep = (keys) => (Array.isArray(keys) ? keys.filter((k) => known.has(k)) : []);

  const visible = keep(state.visibleColumns);
  const groupable = new Set(columns.filter((c) => c.groupable).map((c) => c.key));
  const aggregatable = new Set(columns.filter((c) => c.aggregatable).map((c) => c.key));
  const filters = Object.fromEntries(
    Object.entries(state.filters || {}).filter(([k, v]) => known.has(k) && v !== '' && v !== null && v !== undefined)
  );
  const sortKey = known.has(state.sortConfig?.key) ? state.sortConfig.key : null;

  return {
    visibleColumns: visible.length ? visible : columns.map((c) => c.key),
    groupBy: keep(state.groupBy).filter((k) => groupable.has(k)).slice(0, 2),
    aggregateFields: keep(state.aggregateFields).filter((k) => aggregatable.has(k)),
    chartType: CHART_TYPES.includes(state.chartType) ? state.chartType : 'pie',
    filters,
    sortConfig: { key: sortKey, direction: state.sortConfig?.direction === 'desc' ? 'desc' : 'asc' },
  };
}

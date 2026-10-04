import { useCallback, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TABLE PREFERENCES
//
// Which columns a person wants to see, and how many rows at a time, is a
// preference — not a property of the module. It is kept per module in the
// browser rather than on the record, so one person widening their invoice list
// does not rearrange everybody else's.
//
// `list: true` in the schema stays the DEFAULT, never the ceiling: a column the
// schema does not list can still be turned on, and one it does list can be
// turned off. A saved selection that no longer matches the schema is repaired
// on read rather than dropped, so a renamed field cannot empty someone's table.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = (moduleId) => `crm_table_prefs_${moduleId || 'unknown'}`;

export const PAGE_SIZES = [25, 50, 100, 250];
export const DEFAULT_PAGE_SIZE = 50;

// Which layout a module is read in is the same kind of preference as which
// columns: per person, per module, and kept. It used to reset to the table on
// every navigation, so choosing the board was a choice you made once a minute.
export const VIEW_IDS = ['table', 'cards', 'board'];
export const DEFAULT_VIEW = 'table';

const read = (moduleId) => {
  try {
    return JSON.parse(localStorage.getItem(KEY(moduleId))) || {};
  } catch {
    return {};
  }
};

const write = (moduleId, prefs) => {
  try { localStorage.setItem(KEY(moduleId), JSON.stringify(prefs)); } catch { /* private mode */ }
};

/** The columns to render: the saved choice, repaired against the live schema. */
export function resolveColumns(schema, savedKeys) {
  const fields = schema?.fields || [];
  const byKey = new Map(fields.map((f) => [f.key, f]));
  if (!Array.isArray(savedKeys) || savedKeys.length === 0) {
    return fields.filter((f) => f.list);
  }
  const chosen = savedKeys.map((key) => byKey.get(key)).filter(Boolean);
  // A selection that resolves to nothing — every field renamed or removed —
  // falls back to the schema's own columns instead of an empty table.
  return chosen.length > 0 ? chosen : fields.filter((f) => f.list);
}

/** Per-module table preferences, persisted as the user changes them. */
export function useTablePrefs(moduleId, schema) {
  const [prefs, setPrefs] = useState(() => read(moduleId));

  const save = useCallback(
    (patch) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        write(moduleId, next);
        return next;
      });
    },
    [moduleId]
  );

  const columns = resolveColumns(schema, prefs.columns);
  const pageSize = PAGE_SIZES.includes(prefs.pageSize) ? prefs.pageSize : DEFAULT_PAGE_SIZE;
  // A stored view the build no longer offers — a board on a module whose
  // stages were removed — falls back rather than rendering nothing.
  const view = VIEW_IDS.includes(prefs.view) ? prefs.view : DEFAULT_VIEW;

  const toggleColumn = useCallback(
    (key) => {
      const current = resolveColumns(schema, read(moduleId).columns).map((f) => f.key);
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      // Never let the last column be switched off: a table with no columns is
      // indistinguishable from a broken page.
      if (next.length === 0) return;
      save({ columns: next });
    },
    [moduleId, schema, save]
  );

  const resetColumns = useCallback(() => save({ columns: null }), [save]);

  return {
    columns,
    pageSize,
    view,
    toggleColumn,
    resetColumns,
    setPageSize: (n) => save({ pageSize: n }),
    setView: (id) => save({ view: VIEW_IDS.includes(id) ? id : DEFAULT_VIEW }),
  };
}

/**
 * Pure logic for grouping and aggregating tabular data.
 * Used by BiDataTable for pivot/grouped table rendering.
 */

const EMPTY_LABEL = '(ריק)';

/**
 * Group rows by up to 2 keys, returning a tree structure.
 * @param {Array<Object>} rows - Data rows
 * @param {Array<string>} groupByKeys - Field keys to group by (max 2 used)
 * @returns {Array<{key, value, rows, children, count}>}
 */
export function groupRows(rows, groupByKeys) {
  if (!rows || rows.length === 0 || !groupByKeys || groupByKeys.length === 0) return [];
  const keys = groupByKeys.filter(Boolean);
  if (keys.length === 0) return [];
  const maxKeys = keys.slice(0, 2);

  function getGroupKey(value) {
    if (value === null || value === undefined || value === '') return EMPTY_LABEL;
    return String(value);
  }

  function buildGroup(key, value, rowData) {
    return { key, value, rows: rowData, children: [], count: 0 };
  }

  // First level
  const rootMap = new Map();
  rows.forEach(row => {
    const rawValue = row[maxKeys[0]];
    const groupKey = getGroupKey(rawValue);
    if (!rootMap.has(groupKey)) rootMap.set(groupKey, buildGroup(groupKey, rawValue, []));
    rootMap.get(groupKey).rows.push(row);
  });

  const result = Array.from(rootMap.values());
  result.forEach(g => { g.count = g.rows.length; });
  if (maxKeys.length === 1) return result;

  // Second level
  result.forEach(group => {
    const subMap = new Map();
    group.rows.forEach(row => {
      const subValue = row[maxKeys[1]];
      const subKey = getGroupKey(subValue);
      if (!subMap.has(subKey)) subMap.set(subKey, buildGroup(subKey, subValue, []));
      subMap.get(subKey).rows.push(row);
    });
    group.children = Array.from(subMap.values());
    group.children.forEach(g => { g.count = g.rows.length; });
  });

  return result;
}

/**
 * Aggregate rows by field specs.
 * @param {Array<Object>} rows - Data rows
 * @param {Array<{field, fn}>} specs - Aggregation specs (fn: sum|avg|count|min|max)
 * @returns {Object} Map of field -> aggregate value
 */
export function aggregate(rows, specs) {
  const result = {};
  if (!specs || specs.length === 0) return result;
  if (!rows || rows.length === 0) {
    specs.forEach(({ field, fn }) => { result[field] = fn === 'count' ? 0 : null; });
    return result;
  }

  specs.forEach(({ field, fn }) => {
    if (!field) { result[field] = null; return; }

    if (fn === 'count') {
      result[field] = rows.length;
      return;
    }

    const rawValues = rows.map(r => r[field]);

    if (fn === 'sum' || fn === 'avg') {
      const nums = rawValues
        .map(v => {
          if (typeof v === 'number') return v;
          if (v != null && v !== '' && !isNaN(Number(v))) return Number(v);
          return null;
        })
        .filter(v => v !== null && !isNaN(v));

      if (nums.length === 0) {
        result[field] = null;
      } else if (fn === 'sum') {
        result[field] = nums.reduce((a, b) => a + b, 0);
      } else {
        result[field] = nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      return;
    }

    if (fn === 'min' || fn === 'max') {
      const valid = rawValues.filter(v => v !== null && v !== undefined && v !== '');
      if (valid.length === 0) { result[field] = null; return; }
      result[field] = valid.reduce((best, v) => {
        if (fn === 'min') return v < best ? v : best;
        return v > best ? v : best;
      }, valid[0]);
      return;
    }

    result[field] = null;
  });

  return result;
}

/**
 * Format an aggregate value for display.
 * @param {*} value - The aggregate value
 * @param {string} fn - The aggregation function used
 * @param {string} fieldType - The field type ('currency'|'number'|'date'|'text'|'badge')
 * @returns {string} Formatted value
 */
export function formatAggregate(value, fn, fieldType) {
  if (value === null || value === undefined || value === '') return '—';
  if (fn === 'count') return String(value);
  if (fieldType === 'currency') return `₪${Number(value).toLocaleString('he-IL')}`;
  if (fieldType === 'percent') return `${Number(value).toFixed(0)}%`;
  if (fn === 'avg') return Number(value).toFixed(1);
  if (typeof value === 'number') return value.toLocaleString('he-IL');
  return String(value);
}
/**
 * Per-user project ordering utilities.
 *
 * applyUserOrder — returns projects ordered by the user's personal project_order
 * list. Projects not in the list are appended at the end, sorted by (order ?? 0)
 * ascending then created_date descending. IDs in userOrder that no longer exist
 * are silently filtered out.
 *
 * reorder — returns a new array of IDs with the item at fromIndex moved to toIndex.
 */

const fallbackSort = (a, b) => {
  const ao = a.order ?? 0;
  const bo = b.order ?? 0;
  if (ao !== bo) return ao - bo;
  return new Date(b.created_date || 0) - new Date(a.created_date || 0);
};

export function applyUserOrder(projects, userOrder) {
  if (!Array.isArray(projects) || projects.length === 0) return [];
  const orderList = Array.isArray(userOrder) ? userOrder : [];

  const projectMap = new Map(projects.map(p => [p.id, p]));

  // Projects in userOrder that still exist (preserves userOrder sequence).
  const ordered = orderList
    .filter(id => projectMap.has(id))
    .map(id => projectMap.get(id));

  // Remaining projects not in userOrder — sorted by order then created_date desc.
  const orderedIdSet = new Set(orderList);
  const remaining = projects
    .filter(p => !orderedIdSet.has(p.id))
    .sort(fallbackSort);

  return [...ordered, ...remaining];
}

export function reorder(ids, fromIndex, toIndex) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  if (fromIndex === toIndex) return [...ids];
  if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return [...ids];

  const result = [...ids];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}
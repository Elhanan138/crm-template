// ─────────────────────────────────────────────────────────────────────────────
// ORG CHART
//
// Every employee already names a direct manager. The structure was in the data
// and nowhere on screen: the only way to see who reports to whom was to sort a
// table by a column of names and do the tree in your head.
//
// The tree is derived, never stored, so it cannot disagree with the records.
// A name that matches nobody (a manager who left, a typo) makes that person a
// root rather than dropping them — an org chart that silently loses people is
// worse than one that shows a gap. A loop (A manages B manages A) is broken at
// the point it closes rather than recursing forever.
// ─────────────────────────────────────────────────────────────────────────────

const norm = (value) => String(value ?? '').trim().toLowerCase();

/** People still in the organisation — someone who left is not on the chart. */
export const isCurrent = (employee) => employee?.status !== 'ended';

/**
 * The reporting tree.
 *
 * Returns roots: [{ employee, reports: [...same shape] }], each level sorted by
 * name. Every current employee appears exactly once.
 */
export function buildOrgTree(employees = []) {
  const people = (employees || []).filter(isCurrent);
  const byName = new Map();
  for (const person of people) {
    const key = norm(person.full_name);
    if (key && !byName.has(key)) byName.set(key, person);
  }

  const reportsOf = new Map();
  const roots = [];
  for (const person of people) {
    const manager = byName.get(norm(person.manager));
    if (manager && manager !== person) {
      if (!reportsOf.has(manager.id)) reportsOf.set(manager.id, []);
      reportsOf.get(manager.id).push(person);
    } else {
      roots.push(person);
    }
  }

  const byNameOrder = (a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'he');
  const placed = new Set();

  const node = (person, path) => {
    placed.add(person.id);
    const reports = (reportsOf.get(person.id) || [])
      // A loop is cut where it closes.
      .filter((r) => !path.has(r.id))
      .sort(byNameOrder)
      .map((r) => node(r, new Set([...path, r.id])));
    return { employee: person, reports };
  };

  const tree = roots.sort(byNameOrder).map((p) => node(p, new Set([p.id])));

  // Anyone inside a closed loop has no root above them. They still belong on
  // the chart, so the loop is entered at one of its members.
  for (const person of people.slice().sort(byNameOrder)) {
    if (!placed.has(person.id)) tree.push(node(person, new Set([person.id])));
  }
  return tree;
}

/** How many people sit under a node, at every depth. */
export const headcountUnder = (node) =>
  node.reports.reduce((sum, r) => sum + 1 + headcountUnder(r), 0);

import { daysUntil } from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// COMPETENCY MATRIX
//
// An enrolment list answers "what is Dana doing this month". The question a
// manager or an auditor actually brings is the other axis: for this mandatory
// course, who is covered and who is not — and for this person, are they fully
// qualified yet. Both were in the enrolments already, one row at a time.
//
// People down the side, courses across the top, one cell per pair, derived
// from the rows that exist. A person with two enrolments in the same course
// (a retake) is judged by the best of them: completed beats in progress beats
// assigned, so a retake in progress does not hide a completion on file.
// ─────────────────────────────────────────────────────────────────────────────

const RANK = { completed: 3, in_progress: 2, assigned: 1, overdue: 0 };

/** The cell's state, with lateness read from the date rather than trusted. */
export function cellState(enrollment) {
  if (!enrollment) return 'none';
  if (enrollment.status === 'completed') return 'completed';
  const left = daysUntil(enrollment.due_date);
  if (enrollment.status === 'overdue' || (left !== null && left < 0)) return 'overdue';
  return enrollment.status === 'in_progress' ? 'in_progress' : 'assigned';
}

export const CELL_STATES = [
  { value: 'completed', label: 'הושלם', tone: 'success' },
  { value: 'in_progress', label: 'בתהליך', tone: 'info' },
  { value: 'assigned', label: 'הוקצה', tone: 'neutral' },
  { value: 'overdue', label: 'באיחור', tone: 'destructive' },
  { value: 'none', label: 'לא הוקצה', tone: 'neutral' },
];

export const cellMeta = (state) => CELL_STATES.find((s) => s.value === state) || CELL_STATES.at(-1);

const better = (a, b) => (RANK[cellState(a)] ?? -1) >= (RANK[cellState(b)] ?? -1) ? a : b;

/**
 * { people, courses, cell(person, course), coverage(course), readiness(person) }
 *
 * Mandatory courses come first, because coverage of those is the number that
 * is actually checked.
 */
export function competencyMatrix(enrollments = []) {
  const rows = (enrollments || []).filter((e) => e?.participant && e?.course_name);
  const cells = new Map();
  const mandatory = new Set();
  for (const e of rows) {
    const key = `${e.participant}\u0000${e.course_name}`;
    cells.set(key, cells.has(key) ? better(cells.get(key), e) : e);
    if (e.mandatory) mandatory.add(e.course_name);
  }

  const people = [...new Set(rows.map((e) => e.participant))].sort((a, b) => a.localeCompare(b, 'he'));
  const courses = [...new Set(rows.map((e) => e.course_name))].sort((a, b) =>
    (mandatory.has(b) - mandatory.has(a)) || a.localeCompare(b, 'he'));

  const cell = (person, course) => cells.get(`${person}\u0000${course}`) || null;

  /** Share of the people assigned a course who have completed it. */
  const coverage = (course) => {
    const assigned = people.map((p) => cell(p, course)).filter(Boolean);
    if (!assigned.length) return null;
    return Math.round((assigned.filter((e) => cellState(e) === 'completed').length / assigned.length) * 100);
  };

  /** Share of a person's MANDATORY courses they have completed. */
  const readiness = (person) => {
    const required = courses.filter((c) => mandatory.has(c)).map((c) => cell(person, c)).filter(Boolean);
    if (!required.length) return null;
    return Math.round((required.filter((e) => cellState(e) === 'completed').length / required.length) * 100);
  };

  return { people, courses, mandatory, cell, coverage, readiness };
}

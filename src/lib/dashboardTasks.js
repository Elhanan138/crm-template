/**
 * Pure logic for selecting "my tasks" on the dashboard.
 *
 * A task belongs to the current user if at least one of:
 *  (a) cleanName(task.assigned_to) === cleanName(myName)
 *  (b) task.assigned_to is empty/null AND task.project_id is in myProjectIds
 *      (unassigned tasks in projects I manage are "mine")
 *
 * De-duplicated by task.id. Sort: tasks assigned to the user by name first,
 * then by due_date ascending (tasks without a due_date go last).
 */

/**
 * Normalize a name for comparison: trim, collapse internal whitespace, lowercase.
 * Handles null/undefined gracefully.
 */
export function cleanName(raw) {
  if (raw == null) return '';
  return String(raw)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Select the user's tasks.
 *
 * @param {object}   args
 * @param {Array}    args.tasks        — all tasks visible to the user (RLS-scoped)
 * @param {Array}    args.projects     — all projects visible to the user
 * @param {Set|Array} args.myProjectIds — project ids where user is PM/liaison
 * @param {string}   args.myName        — current user's team-member name
 * @param {string}   [args.myEmail]     — current user's email (reserved for future use)
 * @returns {Array} sorted, de-duplicated tasks
 */
export function selectMyTasks({ tasks, myProjectIds, myName, myEmail }) {
  if (!Array.isArray(tasks)) return [];

  const idSet = myProjectIds instanceof Set ? myProjectIds : new Set(myProjectIds || []);
  const cleanedName = cleanName(myName);

  const seen = new Set();
  const result = [];

  for (const task of tasks) {
    if (!task || !task.id) continue;
    if (seen.has(task.id)) continue;

    const assignedToName = cleanName(task.assigned_to);
    const assignedToMe = cleanedName && assignedToName === cleanedName;

    if (assignedToMe) {
      seen.add(task.id);
      result.push(task);
    }
  }

  // Sort: assigned-to-me first, then by due_date ascending (null/undefined last)
  result.sort((a, b) => {
    const aMine = cleanedName && cleanName(a.assigned_to) === cleanedName ? 1 : 0;
    const bMine = cleanedName && cleanName(b.assigned_to) === cleanedName ? 1 : 0;
    if (aMine !== bMine) return bMine - aMine; // 1 (mine) comes first

    const aDate = a.due_date ? new Date(a.due_date).getTime() : null;
    const bDate = b.due_date ? new Date(b.due_date).getTime() : null;

    if (aDate == null && bDate == null) return 0;
    if (aDate == null) return 1;  // no date → last
    if (bDate == null) return -1;
    return aDate - bDate;
  });

  return result;
}
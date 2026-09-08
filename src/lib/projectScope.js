/**
 * Project scope filtering — "mine" vs "all".
 *
 * isMyProject checks whether a project belongs to the current user by:
 * - project_manager name (normalized: trim + lowercase)
 * - current_liaison name (normalized: trim + lowercase)
 * - created_by_id === myUserId
 *
 * NOTE: member_emails is intentionally NOT checked here. member_emails represents
 * access (who can see the project), not ownership. For an admin or any user who
 * is a member of every project, checking member_emails would make "mine" show
 * the same list as "all" — defeating the filter's purpose.
 * "Mine" means projects the user is directly responsible for (PM, liaison, creator).
 *
 * filterScope — 'all' returns everything, 'mine' filters to the user's projects.
 */

const normalizeName = (s) => (s || '').trim().toLowerCase();

export function isMyProject(project, identity) {
  if (!project || !identity) return false;

  if (identity.myUserId && project.created_by_id === identity.myUserId) return true;

  if (identity.myName) {
    const myName = normalizeName(identity.myName);
    if (myName) {
      if (normalizeName(project.project_manager) === myName) return true;
      if (normalizeName(project.current_liaison) === myName) return true;
    }
  }

  return false;
}

export function filterScope(projects, scope, identity) {
  if (scope === 'mine') return projects.filter(p => isMyProject(p, identity));
  return projects;
}
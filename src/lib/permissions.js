// Central permission definitions shared across the app.
//
// THE PERMISSION MODEL — binary, exactly TWO kinds of access:
// 1. Admin (User.role === 'admin' or the owner email) — full access to EVERYTHING.
// 2. Project member — full access to a specific project (read + write + all tabs).
//    Granted via a ProjectPermission record (any non-empty permissions array = full access),
//    OR automatically when the user is the project_manager / current_liaison / creator.
// There are NO granular permissions (no view/edit/manage_X split).

// No hardcoded admin email — first user sets up as admin via FirstTimeSetup.

// The single permission value stored in ProjectPermission.permissions.
export const PROJECT_ACCESS_PERM = 'full';

// Binary check: any ProjectPermission record with a non-empty permissions array
// means full access to that project.
export function hasFullProjectAccess(permissions) {
  return Array.isArray(permissions) && permissions.length > 0;
}

// Central email normalization. Strip mailto:/stray leading-trailing dashes, then
// lowercase + trim. MUST be used for EVERY email comparison across the app so that
// casing/whitespace/formatting differences never hide a valid grant or admin match.
export function cleanEmail(email) {
  if (!email) return '';
  return email.replace(/^mailto:/i, '').replace(/^-+/, '').replace(/-+$/, '').toLowerCase().trim();
}

// Admin = user.role === 'admin' (the single source of truth, managed via
// manageTeamMember and syncPermissions) or the hardcoded owner email as a
// safety net. TeamMember.is_admin is NO LONGER checked on the client — it is
// only used server-side to drive the User.role reconciliation.
export function isAdminUser(user) {
  return user?.role === 'admin';
}
/**
 * Pseudo-assignee representing "the client" — used in owner/assignee dropdowns
 * to mark tasks whose ball is in the client's court.
 *
 * It is NOT a TeamMember: no email, no notifications, no hours-bank impact.
 * The single source of truth for the display name — never hardcode 'הלקוח' elsewhere.
 */
export const CLIENT_ASSIGNEE = { name: 'הלקוח', email: '', is_client: true };

/**
 * Returns true when the given name matches the client pseudo-assignee.
 */
export const isClientAssignee = (name) => (name || '').trim() === CLIENT_ASSIGNEE.name;
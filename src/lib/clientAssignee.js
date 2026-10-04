/**
 * Pseudo-assignee representing "the client" — used in owner/assignee dropdowns
 * to mark tasks whose ball is in the client's court.
 *
 * It is NOT a TeamMember: no email, no notifications, no hours-bank impact.
 * The single source of truth for the display name — never hardcode 'הלקוח' elsewhere.
 */
// `id` is here because it is a RECORD-SHAPED value: every people list in the
// system keys its rows by `m.id`, and this one entry had none — so React
// warned about a missing key on every assignee dropdown that offers the
// client. Giving it a stable id once fixes all of them; `is_client` stays the
// marker that tells it apart from a real TeamMember.
export const CLIENT_ASSIGNEE = { id: '__client__', name: 'הלקוח', email: '', is_client: true };

/**
 * Returns true when the given name matches the client pseudo-assignee.
 */
export const isClientAssignee = (name) => (name || '').trim() === CLIENT_ASSIGNEE.name;
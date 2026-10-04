/**
 * Extracts up to two uppercase initials from a display name.
 * Hebrew, English, or any whitespace-separated name.
 * For a single word, returns the first letter.
 */
export function initialsOf(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Resolves the best display name for a ticket submitter.
 * Priority: matching TeamMember (by email) → submitted_by (only if it's NOT an email).
 * NEVER falls back to email or email prefix — if no TeamMember found, returns ''.
 */
export function resolveSubmitterName(ticket, teamMembers = []) {
  if (!ticket) return '';
  // Internal items are admin-initiated — submitted_by is already a proper name
  if (ticket.internal) return ticket.submitted_by || '';

  const email = (ticket.submitted_by_email || '').toLowerCase().trim();
  if (email && teamMembers.length > 0) {
    const member = teamMembers.find(m =>
      (m.email || '').toLowerCase().trim() === email
    );
    if (member?.name) return member.name;
  }

  // If submitted_by looks like an email or email prefix, reject it — no name to show
  const submittedBy = (ticket.submitted_by || '').trim();
  if (submittedBy && !submittedBy.includes('@') && !submittedBy.includes('.')) {
    return submittedBy;
  }

  // Never fall back to email or email prefix — return empty if no TeamMember found
  return '';
}
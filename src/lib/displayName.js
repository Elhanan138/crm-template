/**
 * Returns the best available display name for a user.
 * Priority: teamMember.name → user.full_name → user.name → user.display_name
 * If none are set, derives a first name from the email (e.g. "dana.l@…" → "Dana").
 */
export function getDisplayName(user, teamMember) {
  const name = teamMember?.name || user?.full_name || user?.name || user?.display_name;
  if (name && name.trim()) return name.trim();

  const email = user?.email || '';
  if (!email) return 'משתמש';

  const localPart = email.split('@')[0];
  const firstName = localPart.split(/[._\-]/)[0];
  if (!firstName) return 'משתמש';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

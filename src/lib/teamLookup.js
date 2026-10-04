/**
 * Finds a TeamMember by name with trim + case-insensitive matching.
 * Falls back to double-space collapsing if no exact match is found.
 *
 * @param {Array} teamMembers - Array of TeamMember records
 * @param {string} name - Name to search for
 * @returns {object|null} The matching TeamMember or null
 */
export function findMemberByName(teamMembers, name) {
  if (!name || !teamMembers || teamMembers.length === 0) return null;
  const normalized = String(name).trim().toLowerCase();
  if (!normalized) return null;

  // Exact match (trimmed, case-insensitive)
  let match = teamMembers.find(m => (m.name || '').trim().toLowerCase() === normalized);
  if (match) return match;

  // Fallback: collapse double spaces in both sides
  const collapse = (s) => s.replace(/\s+/g, ' ');
  const collapsedTarget = collapse(normalized);
  match = teamMembers.find(m => collapse((m.name || '').trim().toLowerCase()) === collapsedTarget);
  return match || null;
}
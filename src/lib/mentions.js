/**
 * Parse @mentions from comment text.
 * A mention is an @ followed by a name, where @ must be at word boundary
 * (start of string or preceded by whitespace). Emails (user@domain.com) and
 * @ inside words are NOT matched.
 *
 * Without knownNames: matches @ followed by non-whitespace (single word).
 * With knownNames: matches @ followed by a known name, supporting multi-word
 * names (e.g. "דנה כהן"). Longer names are matched first to avoid partial matches.
 *
 * @param {string} text
 * @param {string[]} [knownNames] — optional list of full names to match against
 * @returns {string[]} array of mention names (without the @)
 */
export function parseMentions(text, knownNames = []) {
  if (!text || typeof text !== 'string') return [];

  if (!knownNames || knownNames.length === 0) {
    // Without known names — match @ followed by non-whitespace
    const pattern = /(?:^|\s)@(\S+)/g;
    const names = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      names.push(match[1]);
    }
    return names;
  }

  // With known names — match @ followed by a known name (handles multi-word)
  const sorted = [...knownNames].filter(Boolean).sort((a, b) => b.length - a.length);
  const found = [];
  for (const name of sorted) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|\\s|[ושכלבמה])@${escaped}(?=\\s|$|[@.!?;,\\n)])`, '');
    if (pattern.test(text)) found.push(name);
  }
  return found;
}

/**
 * Compare two arrays of mention identifiers (names or emails) and return
 * what was added and what was removed. Comparison is case-insensitive.
 *
 * @param {string[]} before
 * @param {string[]} after
 * @returns {{ added: string[], removed: string[] }}
 */
export function diffMentions(before = [], after = []) {
  const norm = (arr) => (arr || []).map(s => String(s).toLowerCase());
  const beforeSet = new Set(norm(before));
  const afterSet = new Set(norm(after));
  return {
    added: (after || []).filter(s => !beforeSet.has(String(s).toLowerCase())),
    removed: (before || []).filter(s => !afterSet.has(String(s).toLowerCase())),
  };
}
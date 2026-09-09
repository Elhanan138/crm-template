// ── Hebrew normalization: strip niqqud, convert final letters, collapse spaces ──
export function normalizeHebrew(s) {
  if (!s) return '';
  return s
    .toString()
    .replace(/[\u0591-\u05C7\u05BD-\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '')
    .replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ').replace(/ץ/g, 'צ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ── Relevance scoring on normalized text ──
export function scoreMatch(query, primary, ...secondary) {
  const q = normalizeHebrew(query);
  if (q.length < 2) return 0;
  const primaries = (Array.isArray(primary) ? primary : [primary])
    .map(s => normalizeHebrew(s))
    .filter(Boolean);
  let score = 0;
  for (const p of primaries) {
    if (p === q) { score = Math.max(score, 100); continue; }
    if (p.startsWith(q)) { score = Math.max(score, 80); continue; }
    if (p.split(' ').some(w => w.startsWith(q))) { score = Math.max(score, 70); continue; }
    if (p.includes(q)) { score = Math.max(score, 50); continue; }
  }
  if (score === 0 && secondary.some(s => normalizeHebrew(s).includes(q))) score = 25;
  return score;
}

const FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000;
export function freshnessBonus(record) {
  if (!record.updated_date) return 0;
  const d = new Date(record.updated_date);
  if (isNaN(d)) return 0;
  return (Date.now() - d.getTime()) <= FRESHNESS_MS ? 5 : 0;
}
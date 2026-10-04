// ─────────────────────────────────────────────────────────────────────────────
// RECENT ACTIVITY
//
// An empty search box used to show an empty panel. The two things a person is
// most likely to want are what they searched for last and what they opened
// last, and both are already known — they were simply never kept.
//
// Local to the browser and to the person, capped, and never allowed to throw:
// a private window with storage disabled must degrade to "no history", not to a
// broken search box.
// ─────────────────────────────────────────────────────────────────────────────

const SEARCHES_KEY = 'recent_searches';
const RECORDS_KEY = 'recent_records';
const MAX_SEARCHES = 5;
const MAX_RECORDS = 3;

const read = (key, fallback = []) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
};

const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

export const recentSearches = () => read(SEARCHES_KEY);

export function rememberSearch(text) {
  const query = String(text || '').trim();
  if (query.length < 2) return;
  const next = [query, ...recentSearches().filter((s) => s !== query)].slice(0, MAX_SEARCHES);
  write(SEARCHES_KEY, next);
}

export const clearSearches = () => write(SEARCHES_KEY, []);

export const recentRecords = () => read(RECORDS_KEY);

/**
 * Remember an opened record. Identity is (type, id), so reopening something
 * moves it to the front rather than adding a duplicate.
 */
export function rememberRecord(entry) {
  if (!entry?.id || !entry?.path) return;
  const item = {
    id: entry.id,
    type: entry.type || '',
    label: String(entry.label || '').slice(0, 80),
    sub: String(entry.sub || '').slice(0, 80),
    path: entry.path,
    at: Date.now(),
  };
  const next = [item, ...recentRecords().filter((r) => !(r.id === item.id && r.type === item.type))]
    .slice(0, MAX_RECORDS);
  write(RECORDS_KEY, next);
}

export const clearRecords = () => write(RECORDS_KEY, []);

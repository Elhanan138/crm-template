// Frontend wrapper for normalizeValues — re-exports formatHebrewDate for UI use.
// Mirrors the normalization the server applies before persisting values.
export function formatHebrewDate(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
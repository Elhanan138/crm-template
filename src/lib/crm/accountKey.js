// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT KEY — the one normalization every customer-side link runs through.
//
// The same customer is stored under three different field names across the
// system: `company` (leads, contacts), `client_name` (invoices, projects) and
// `customer` (subscriptions). Matching them by raw string means "בלוסום בע\"מ"
// and "בלוסום בעמ" are two different customers, silently, and the link between
// a lead and its invoices just does not appear.
//
// This module is deliberately the ONLY place that decides what "the same
// customer" means. It stores nothing and changes no schema: the key is derived
// on read, so it works on data that already exists and in a partial export that
// contains only one of the modules involved.
// ─────────────────────────────────────────────────────────────────────────────

// Legal-form suffixes carry no identity. They are compared after punctuation is
// stripped, so "בע\"מ", "בע״מ" and "בעמ" all arrive here as the same token.
const SUFFIX_TOKENS = new Set([
  'בעמ', 'בעם', 'ער', 'עמותה', 'שותפות', 'חפ',
  'ltd', 'limited', 'inc', 'incorporated', 'llc', 'llp', 'plc', 'corp',
  'corporation', 'co', 'gmbh', 'sa', 'srl', 'bv', 'nv', 'ab', 'oy', 'as',
]);

// Words that describe the record rather than name the customer.
const PREFIX_TOKENS = new Set(['חברת', 'קבוצת', 'the']);

// Quotes — straight, curly, and the Hebrew geresh/gershayim — are removed
// OUTRIGHT rather than turned into a space: in Hebrew they sit INSIDE a word
// ("בע\"מ"), and spacing them would split the suffix into two tokens that no
// longer match anything.
const QUOTES = /['"`´’‘“”׳״]/g;

// Everything else that separates words collapses to a space.
const PUNCTUATION = /[.,\-–—_/\\|()[\]{}<>:;!?*&+@#$%^~=]/g;

// Diacritics: Hebrew niqqud and combining marks. Removed so "בָּלוֹסוֹם" matches "בלוסום".
const DIACRITICS = /[֑-ׇ̀-ͯ]/g;

/**
 * The comparable identity of a customer name. Returns '' for anything empty,
 * which callers MUST treat as "no link" rather than as a match — two records
 * with no customer are not the same customer.
 */
export function accountKey(value) {
  if (value === null || value === undefined) return '';

  const tokens = String(value)
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .replace(QUOTES, '')
    .replace(PUNCTUATION, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  // Suffixes only lose their meaning at the end, prefixes only at the start —
  // "קבוצת" inside a name is part of the name.
  while (tokens.length > 1 && SUFFIX_TOKENS.has(tokens[tokens.length - 1])) tokens.pop();
  while (tokens.length > 1 && PREFIX_TOKENS.has(tokens[0])) tokens.shift();

  return tokens.join(' ');
}

/** Do two customer names refer to the same account? Empty never matches. */
export function sameAccount(a, b) {
  const left = accountKey(a);
  return left !== '' && left === accountKey(b);
}

/** Group records by their account key, skipping those that carry none. */
export function groupByAccount(records, field) {
  const map = new Map();
  for (const record of records || []) {
    const key = accountKey(record?.[field]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  }
  return map;
}

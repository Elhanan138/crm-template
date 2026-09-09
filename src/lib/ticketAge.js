/**
 * Pure logic for ticket age display and grouping on the dashboard.
 *
 * ticketAgeDays(ticket, now) — calendar-day difference from created_date.
 * ticketAgeTone(days)        — { label, className } with Hebrew pluralization.
 * groupTicketsByType(tickets) — ordered [{ type, label, tickets, count }].
 */

/**
 * @param {object} ticket
 * @param {Date}   [now=new Date()]
 * @returns {number} whole days since created_date (0 if missing/invalid)
 */
export function ticketAgeDays(ticket, now = new Date()) {
  if (!ticket || !ticket.created_date) return 0;
  const created = new Date(ticket.created_date);
  if (isNaN(created.getTime())) return 0;
  const ms = now.getTime() - created.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * @param {number} days
 * @returns {{ label: string, className: string }}
 */
export function ticketAgeTone(days) {
  const d = Math.max(0, Math.floor(days || 0));

  if (d <= 2) {
    return { label: ageLabel(d), className: 'bg-muted text-muted-foreground' };
  }
  if (d <= 6) {
    return { label: ageLabel(d), className: 'bg-warning-muted text-warning' };
  }
  return { label: ageLabel(d), className: 'bg-destructive/10 text-destructive' };
}

/**
 * Hebrew label for a number of days: "היום" for 0, "יום 1" for 1, "3 ימים" for 3+.
 */
function ageLabel(days) {
  if (days === 0) return 'היום';
  if (days === 1) return 'יום 1';
  return `${days} ימים`;
}

const TYPE_ORDER = [
  { type: 'bug', label: 'תקלות' },
  { type: 'improvement', label: 'שיפורים' },
  { type: 'feature', label: "פיצ'רים" },
  { type: 'other', label: 'אחר' },
];
const TYPE_MAP = new Map(TYPE_ORDER.map(t => [t.type, t]));

/**
 * Group tickets by type in a fixed order. Unknown types fall to "other".
 * Empty groups are omitted.
 *
 * @param {Array} tickets
 * @returns {Array<{ type: string, label: string, tickets: Array, count: number }>}
 */
export function groupTicketsByType(tickets) {
  if (!Array.isArray(tickets)) return [];

  const buckets = new Map();
  for (const t of tickets) {
    if (!t) continue;
    const type = TYPE_MAP.has(t.type) ? t.type : 'other';
    if (!buckets.has(type)) buckets.set(type, []);
    buckets.get(type).push(t);
  }

  const result = [];
  for (const { type, label } of TYPE_ORDER) {
    const groupTickets = buckets.get(type);
    if (!groupTickets || groupTickets.length === 0) continue;
    result.push({ type, label, tickets: groupTickets, count: groupTickets.length });
  }

  return result;
}

/**
 * Flatten grouped tickets back into a flat list (after limit is applied per-group).
 *
 * @param {Array<{ tickets: Array }>} groups
 * @param {number} [limit]  — max total items
 * @returns {Array} flattened tickets, respecting group order, up to limit
 */
export function flattenGroups(groups, limit) {
  if (!Array.isArray(groups)) return [];
  const out = [];
  for (const g of groups) {
    for (const t of g.tickets) {
      if (limit != null && out.length >= limit) return out;
      out.push(t);
    }
  }
  return out;
}
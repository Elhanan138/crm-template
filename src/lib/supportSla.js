// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT SLA
//
// The queue showed how old a ticket was and nothing about whether that age
// was a problem. Three days is fine for a low-priority suggestion and a
// failure for an urgent bug — and the screen coloured them the same.
//
// The commitment is set by PRIORITY, the clock starts when the ticket is
// opened, stops while it is on hold (waiting on the customer is not our
// delay), and the verdict on a resolved ticket is fixed by when it was
// resolved, not re-judged every morning after.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

/** Days to resolve, per priority. */
export const SLA_DAYS = { urgent: 1, high: 2, medium: 5, low: 10 };

export const SLA_STATES = [
  { value: 'ok', label: 'בזמן', tone: 'neutral' },
  { value: 'at_risk', label: 'קרוב ליעד', tone: 'warning' },
  { value: 'breached', label: 'חריגה מ-SLA', tone: 'destructive' },
  { value: 'met', label: 'עמד ביעד', tone: 'success' },
  { value: 'missed', label: 'לא עמד ביעד', tone: 'destructive' },
  { value: 'paused', label: 'מוקפא', tone: 'neutral' },
];

export const slaMeta = (state) => SLA_STATES.find((s) => s.value === state) || SLA_STATES[0];

const asTime = (value) => {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};

/**
 * Where one ticket stands against its commitment.
 *
 * Returns { state, target, daysLeft } — `daysLeft` is fractional, negative
 * once breached, and null when it does not apply (paused, resolved, no date).
 */
export function ticketSla(ticket, now = new Date()) {
  const opened = asTime(ticket?.created_date);
  const days = SLA_DAYS[ticket?.priority] ?? SLA_DAYS.medium;
  if (opened === null) return { state: 'ok', target: null, daysLeft: null };
  const target = opened + days * DAY;

  if (ticket.status === 'resolved') {
    const closed = asTime(ticket.resolved_date || ticket.updated_date) ?? now.getTime();
    return { state: closed <= target ? 'met' : 'missed', target, daysLeft: null };
  }
  if (ticket.status === 'on_hold') return { state: 'paused', target, daysLeft: null };

  const daysLeft = (target - now.getTime()) / DAY;
  // "At risk" is the last quarter of the window, but never less than a few
  // hours: an urgent ticket's quarter-day is already gone by the time anyone
  // looks.
  const warnAt = Math.max(days * 0.25, 0.25);
  const state = daysLeft < 0 ? 'breached' : daysLeft <= warnAt ? 'at_risk' : 'ok';
  return { state, target, daysLeft };
}

/** How many open tickets have broken their commitment. */
export const breachedCount = (tickets = [], now = new Date()) =>
  (tickets || []).filter((t) => ticketSla(t, now).state === 'breached').length;

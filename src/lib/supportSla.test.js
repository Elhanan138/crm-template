import { describe, it, expect } from 'vitest';
import { ticketSla, breachedCount, SLA_DAYS, SLA_STATES, slaMeta } from './supportSla';
import { TONES, normalizeTone } from './tones';
import { EN } from './i18n/dictionary';

const now = new Date('2026-05-10T12:00:00Z');
const opened = (daysAgo) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
const ticket = (over) => ({ status: 'open', priority: 'medium', created_date: opened(1), ...over });

describe('the commitment depends on the priority', () => {
  it('breaches an urgent ticket after a day, and leaves a low one alone', () => {
    expect(ticketSla(ticket({ priority: 'urgent', created_date: opened(1.5) }), now).state).toBe('breached');
    expect(ticketSla(ticket({ priority: 'low', created_date: opened(1.5) }), now).state).toBe('ok');
  });

  it('warns in the last stretch before the target', () => {
    // medium = 5 days; four and a half in, half a day is left.
    expect(ticketSla(ticket({ created_date: opened(4.5) }), now).state).toBe('at_risk');
    expect(ticketSla(ticket({ created_date: opened(1) }), now).state).toBe('ok');
  });

  it('falls back to the medium commitment for an unknown priority', () => {
    const { target } = ticketSla(ticket({ priority: 'whenever', created_date: opened(0) }), now);
    expect(Math.round((target - now.getTime()) / 86400000)).toBe(SLA_DAYS.medium);
  });
});

describe('the clock is fair', () => {
  it('stops while the ticket waits on the customer', () => {
    expect(ticketSla(ticket({ status: 'on_hold', created_date: opened(30) }), now).state).toBe('paused');
  });

  it('judges a resolved ticket by when it was resolved, not by today', () => {
    const met = ticket({ status: 'resolved', created_date: opened(30), resolved_date: opened(27) });
    const missed = ticket({ status: 'resolved', created_date: opened(30), resolved_date: opened(20) });
    expect(ticketSla(met, now).state).toBe('met');
    expect(ticketSla(missed, now).state).toBe('missed');
  });

  it('says nothing alarming about a ticket with no open date', () => {
    expect(ticketSla({ status: 'open' }, now).state).toBe('ok');
  });
});

describe('the count and the vocabulary', () => {
  it('counts only open tickets past their commitment', () => {
    const tickets = [
      ticket({ priority: 'urgent', created_date: opened(3) }),
      ticket({ priority: 'urgent', created_date: opened(3), status: 'on_hold' }),
      ticket({ priority: 'low', created_date: opened(3) }),
    ];
    expect(breachedCount(tickets, now)).toBe(1);
    expect(breachedCount(null, now)).toBe(0);
  });

  it('every state carries a known tone and an English label', () => {
    for (const s of SLA_STATES) {
      expect(TONES).toContain(normalizeTone(s.tone));
      expect(EN[s.label], s.label).toBeTruthy();
    }
    expect(slaMeta('nope')).toBe(SLA_STATES[0]);
  });
});

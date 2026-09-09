import { describe, it, expect, beforeEach } from 'vitest';
import { runAutomations, conditionHolds, eventFires, matchingRecords } from './automationRunner';

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();

function memoryStore(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getCollection: (name) => data[name] || [],
    setCollection: (name, items) => { data[name] = items; },
    createRecord: (name, record) => {
      const created = { ...record, id: `${name}-${(data[name] || []).length + 1}` };
      data[name] = [...(data[name] || []), created];
      return created;
    },
    updateRecord: (name, id, patch) => {
      data[name] = (data[name] || []).map((r) => (r.id === id ? { ...r, ...patch } : r));
    },
  };
}

const rule = (over = {}) => ({
  id: 'r1', name: 'כלל', subject: 'Lead', event: 'created',
  active: true, run_mode: 'auto', conditions: [], actions: [], ...over,
});

describe('conditions', () => {
  it('compares as text, numbers and emptiness', () => {
    const record = { stage: 'Won', value: 5000, notes: '' };
    expect(conditionHolds(record, { field: 'stage', operator: 'eq', value: 'won' })).toBe(true);
    expect(conditionHolds(record, { field: 'stage', operator: 'neq', value: 'won' })).toBe(false);
    expect(conditionHolds(record, { field: 'value', operator: 'gt', value: '1000' })).toBe(true);
    expect(conditionHolds(record, { field: 'value', operator: 'lt', value: '1000' })).toBe(false);
    expect(conditionHolds(record, { field: 'stage', operator: 'contains', value: 'o' })).toBe(true);
    expect(conditionHolds(record, { field: 'notes', operator: 'empty' })).toBe(true);
    expect(conditionHolds(record, { field: 'stage', operator: 'not_empty' })).toBe(true);
  });

  it('an unknown operator never fires', () => {
    expect(conditionHolds({ a: 1 }, { field: 'a', operator: 'wat', value: 1 })).toBe(false);
  });
});

describe('events', () => {
  const now = new Date();

  it('created and updated fire only on records that moved since the last run', () => {
    const since = new Date(Date.now() - DAY);
    expect(eventFires({ created_date: iso(0) }, rule(), now, since)).toBe(true);
    expect(eventFires({ created_date: iso(-5) }, rule(), now, since)).toBe(false);
    // A first run has no `since` and therefore considers everything.
    expect(eventFires({ created_date: iso(-5) }, rule(), now, null)).toBe(true);
  });

  it('date_approaching fires inside the window and not after the date passed', () => {
    const r = rule({ event: 'date_approaching', field: 'due_date', days: 7 });
    expect(eventFires({ due_date: iso(3) }, r, now, null)).toBe(true);
    expect(eventFires({ due_date: iso(30) }, r, now, null)).toBe(false);
    expect(eventFires({ due_date: iso(-1) }, r, now, null)).toBe(false);
  });

  it('date_passed and idle measure backwards', () => {
    expect(eventFires({ due_date: iso(-10) }, rule({ event: 'date_passed', field: 'due_date', days: 3 }), now, null)).toBe(true);
    expect(eventFires({ due_date: iso(-1) }, rule({ event: 'date_passed', field: 'due_date', days: 3 }), now, null)).toBe(false);
    expect(eventFires({ updated_date: iso(-40) }, rule({ event: 'idle', days: 30 }), now, null)).toBe(true);
    expect(eventFires({ updated_date: iso(-2) }, rule({ event: 'idle', days: 30 }), now, null)).toBe(false);
  });

  it('an unparsable or missing date never fires', () => {
    const r = rule({ event: 'date_passed', field: 'due_date', days: 0 });
    expect(eventFires({ due_date: 'לא תאריך' }, r, now, null)).toBe(false);
    expect(eventFires({}, r, now, null)).toBe(false);
  });

  it('conditions narrow the matched records', () => {
    const records = [
      { id: 'a', created_date: iso(0), stage: 'won' },
      { id: 'b', created_date: iso(0), stage: 'lost' },
    ];
    const r = rule({ conditions: [{ field: 'stage', operator: 'eq', value: 'won' }] });
    expect(matchingRecords(r, records, new Date(), null, new Set()).map((x) => x.id)).toEqual(['a']);
  });
});

describe('runAutomations', () => {
  let store;
  beforeEach(() => {
    store = memoryStore({
      Lead: [{ id: 'l1', created_date: iso(0), stage: 'won', company: 'בלוסום', owner_email: 'me@x.co' }],
      AutomationRule: [rule({ actions: [{ type: 'create_task', value: 'לטפל ב-{{company}}' }] })],
    });
  });

  it('creates the action it was told to, with the record substituted in', () => {
    const summary = runAutomations(store);
    expect(summary).toMatchObject({ rules: 1, matched: 1, actions: 1 });
    expect(store.data.Task).toHaveLength(1);
    expect(store.data.Task[0].title).toBe('לטפל ב-בלוסום');
  });

  it('never acts twice on the same record — the heartbeat runs every five minutes', () => {
    runAutomations(store);
    const second = runAutomations(store);
    expect(second.matched).toBe(0);
    expect(store.data.Task).toHaveLength(1);
  });

  it('skips inactive and manual-only rules, but runs a manual rule on request', () => {
    store.data.AutomationRule = [
      rule({ id: 'off', active: false, actions: [{ type: 'add_tag', value: 'x' }] }),
      rule({ id: 'manual', run_mode: 'manual', actions: [{ type: 'add_tag', value: 'ידני' }] }),
    ];
    expect(runAutomations(store).rules).toBe(0);

    runAutomations(store, { manualRuleId: 'manual' });
    expect(store.data.Lead[0].tags).toEqual(['ידני']);
  });

  it('updates fields and owners on the subject entity', () => {
    store.data.AutomationRule = [rule({
      actions: [
        { type: 'set_field', field: 'stage', value: 'negotiation' },
        { type: 'assign_owner', value: 'boss@x.co' },
      ],
    })];
    runAutomations(store);
    expect(store.data.Lead[0]).toMatchObject({ stage: 'negotiation', owner_email: 'boss@x.co' });
  });

  it('notifies each recipient once', () => {
    store.data.AutomationRule = [rule({ actions: [{ type: 'notify', value: 'a@x.co, b@x.co' }] })];
    runAutomations(store);
    expect(store.data.Notification.map((n) => n.recipient_email)).toEqual(['a@x.co', 'b@x.co']);
  });

  it('does not duplicate a tag the record already carries', () => {
    store.data.Lead[0].tags = ['חם'];
    store.data.AutomationRule = [rule({ actions: [{ type: 'add_tag', value: 'חם' }] })];
    runAutomations(store);
    expect(store.data.Lead[0].tags).toEqual(['חם']);
  });

  it('records when it last ran, so the next run knows what is new', () => {
    runAutomations(store);
    expect(store.data.AutomationState[0].lastRunAt).toBeTruthy();
  });

  it('a rule with no subject is skipped rather than throwing', () => {
    store.data.AutomationRule = [rule({ subject: '' })];
    expect(() => runAutomations(store)).not.toThrow();
  });
});

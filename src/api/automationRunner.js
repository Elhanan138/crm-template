// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION RUNNER
//
// The automations module shipped with a rule builder and nothing that ran the
// rules. A registry of governance controls whose review dates quietly pass, and
// a screen full of "active" rules that never fire, are worse than no module at
// all — they are a promise the system does not keep.
//
// This is that engine. It is deliberately:
//   • pure over a { getCollection, setCollection } store, so it is testable and
//     so the same code can later run on a server without being rewritten;
//   • schema-free, so a bundle exported without the automations module carries
//     no dead reference — there are simply no rules to run;
//   • idempotent, through a per-rule/per-record fire log. A heartbeat that runs
//     every five minutes must not create the same task twelve times an hour.
// ─────────────────────────────────────────────────────────────────────────────

const STATE_COLLECTION = 'AutomationState';
const DAY = 24 * 60 * 60 * 1000;

const asDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a, b) => Math.floor((a - b) / DAY);

const text = (value) => String(value ?? '').trim().toLowerCase();

/** One condition of a rule against one record. */
export function conditionHolds(record, condition) {
  const actual = record?.[condition.field];
  const expected = condition.value;
  switch (condition.operator) {
    case 'eq': return text(actual) === text(expected);
    case 'neq': return text(actual) !== text(expected);
    case 'gt': return Number(actual) > Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'contains': return text(actual).includes(text(expected));
    case 'empty': return actual === undefined || actual === null || String(actual).trim() === '';
    case 'not_empty': return !(actual === undefined || actual === null || String(actual).trim() === '');
    default: return false;
  }
}

/**
 * Does the rule's trigger apply to this record right now?
 *
 * `since` is the previous run time. 'created' and 'updated' fire on records that
 * crossed it, which is what makes a five-minute heartbeat behave like an event.
 */
export function eventFires(record, rule, now, since) {
  const days = Number(rule.days || 0);
  switch (rule.event) {
    case 'created': {
      const created = asDate(record.created_date);
      return !!created && (!since || created > since);
    }
    case 'updated': {
      const updated = asDate(record.updated_date || record.created_date);
      return !!updated && (!since || updated > since);
    }
    case 'field_changed': {
      // Without a change feed the honest reading is "the field has a value and
      // the record moved since the last run".
      const updated = asDate(record.updated_date || record.created_date);
      const value = record[rule.field];
      return !!updated && (!since || updated > since) &&
        !(value === undefined || value === null || String(value).trim() === '');
    }
    case 'date_approaching': {
      const target = asDate(record[rule.field]);
      if (!target) return false;
      const left = daysBetween(target, now);
      return left >= 0 && left <= days;
    }
    case 'date_passed': {
      const target = asDate(record[rule.field]);
      if (!target) return false;
      return daysBetween(now, target) >= days;
    }
    case 'idle': {
      const touched = asDate(record.updated_date || record.created_date);
      return !!touched && daysBetween(now, touched) >= days;
    }
    default:
      return false;
  }
}

/**
 * A stable key for "this rule already fired for this record".
 *
 * Date-based triggers include the day so a rule can fire again the next day if
 * the condition still holds; the rest fire once per record, ever.
 */
export const fireKey = (rule, record, now) =>
  ['date_approaching', 'date_passed', 'idle'].includes(rule.event)
    ? `${rule.id}:${record.id}:${now.toISOString().slice(0, 10)}`
    : `${rule.id}:${record.id}`;

/** The records a rule matches, minus those it has already acted on. */
export function matchingRecords(rule, records, now, since, fired) {
  return (records || []).filter((record) => {
    if (!eventFires(record, rule, now, since)) return false;
    if (!(rule.conditions || []).every((c) => conditionHolds(record, c))) return false;
    return !fired.has(fireKey(rule, record, now));
  });
}

/**
 * Run every active rule. `store` supplies the collection access, so the caller
 * decides where the data lives.
 *
 * Returns a summary the caller can show: how many rules ran, how many records
 * matched, and what each action did.
 */
export function runAutomations(store, { now = new Date(), manualRuleId = null } = {}) {
  const { getCollection, setCollection, createRecord, updateRecord } = store;

  const rules = getCollection('AutomationRule').filter((rule) => {
    if (manualRuleId) return rule.id === manualRuleId;
    return rule.active !== false && (rule.run_mode || 'auto') === 'auto';
  });

  const state = getCollection(STATE_COLLECTION)[0] || { id: 'automation-state', lastRunAt: null, fired: [] };
  // Running one rule on request means "try this against what we already have",
  // so it looks at every record rather than only at what moved since the last
  // scheduled pass — otherwise a freshly written rule would report zero matches
  // on data it obviously covers. The fire log still applies, so a second press
  // does not act twice.
  const since = manualRuleId ? null : asDate(state.lastRunAt);
  // The fire log is trimmed rather than allowed to grow without bound; the tail
  // is what protects against repeats, the head is history nobody reads.
  const fired = new Set(state.fired || []);

  const summary = { rules: 0, matched: 0, actions: 0, byRule: [] };

  for (const rule of rules) {
    if (!rule.subject) continue;
    const records = matchingRecords(rule, getCollection(rule.subject), now, since, fired);
    summary.rules += 1;
    if (records.length === 0) {
      summary.byRule.push({ rule: rule.name, matched: 0 });
      continue;
    }

    for (const record of records) {
      for (const action of rule.actions || []) {
        applyAction(action, { rule, record, createRecord, updateRecord, now });
        summary.actions += 1;
      }
      fired.add(fireKey(rule, record, now));
    }
    summary.matched += records.length;
    summary.byRule.push({ rule: rule.name, matched: records.length });
  }

  setCollection(STATE_COLLECTION, [{
    ...state,
    id: state.id || 'automation-state',
    // A manual single-rule run must not move the scheduled watermark, or it
    // would swallow the records the next automatic pass was going to act on.
    lastRunAt: manualRuleId ? state.lastRunAt : now.toISOString(),
    fired: [...fired].slice(-2000),
  }]);

  return summary;
}

// Substitutions let a rule's text reference the record it fired on, so one rule
// produces a useful task per record instead of twenty identical ones.
const interpolate = (template, record) =>
  String(template ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => String(record?.[key] ?? ''));

function applyAction(action, { rule, record, createRecord, updateRecord, now }) {
  const value = interpolate(action.value, record);

  switch (action.type) {
    case 'create_task':
      createRecord('Task', {
        title: value || `${rule.name}`,
        description: `נוצר אוטומטית על ידי הכלל "${rule.name}"`,
        status: 'open',
        priority: 'medium',
        project_id: record.project_id || null,
        assigned_to: record.owner_email || record.assigned_to || '',
        source: 'automation',
        due_date: now.toISOString().slice(0, 10),
      });
      break;

    case 'set_field':
      if (action.field) updateRecord(rule.subject, record.id, { [action.field]: value });
      break;

    case 'assign_owner':
      if (value) updateRecord(rule.subject, record.id, { owner_email: value });
      break;

    case 'notify':
      for (const recipient of value.split(',').map((r) => r.trim()).filter(Boolean)) {
        createRecord('Notification', {
          recipient_email: recipient,
          title: rule.name,
          body: rule.description || `כלל האוטומציה "${rule.name}" הופעל`,
          entity: rule.subject,
          entity_id: record.id,
          read: false,
          active: true,
          created_date: now.toISOString(),
        });
      }
      break;

    case 'send_email':
      createRecord('EmailLog', {
        to: record.owner_email || record.contact_email || '',
        subject: value || rule.name,
        body: rule.description || '',
        template: value || '',
        sent_at: now.toISOString(),
        source: 'automation',
      });
      break;

    case 'add_tag': {
      if (!value) break;
      const tags = Array.isArray(record.tags) ? record.tags : [];
      if (!tags.includes(value)) updateRecord(rule.subject, record.id, { tags: [...tags, value] });
      break;
    }

    default:
      break;
  }
}

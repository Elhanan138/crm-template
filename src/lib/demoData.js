import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { isDerived } from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
//
// The opening wizard offers to start from an example. That offer has to be
// real: a button that seeds nothing is worse than no button.
//
// Nothing about a module is described here. Records are generated FROM THE
// SCHEMA — a `currency` field gets an amount, a `select` gets one of its own
// options, a date near a deadline gets a date near now — so a module added
// later is seeded without a line of code, and a module left out of the build
// is not seeded at all.
//
// A shared pool of customer names is the one deliberate choice: it is what
// makes the relations, the duplicate detection and the reports show something
// on the first screen rather than a set of unconnected rows.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_FLAG = 'is_demo';

const CUSTOMERS = [
  'אלפא טכנולוגיות', 'בטא מערכות', 'גמא הנדסה', 'דלתא לוגיסטיקה',
  'אפסילון בריאות', 'זטא פיננסים',
];

const PEOPLE = ['דנה כהן', 'יוסי לוי', 'מיכל אברהם', 'רון שפירא', 'נועה בר', 'עידו מזרחי'];
const WORDS = ['הטמעה', 'הרחבה', 'שדרוג', 'חידוש', 'פיילוט', 'תחזוקה', 'ליווי', 'אפיון'];

// A deterministic pseudo-random source: the same seed produces the same demo
// set, so a screenshot taken today matches the one taken tomorrow.
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const pick = (rand, list) => list[Math.floor(rand() * list.length) % list.length];
const int = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));
// A local calendar day: a date FIELD holds a day, and going through UTC moves
// it across midnight for anyone east of Greenwich.
const dayOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A value that fits the field's declared type. */
function valueFor(field, rand, context) {
  switch (field.type) {
    case 'select': {
      const options = field.options || [];
      return options.length ? pick(rand, options).value : '';
    }
    case 'currency': return int(rand, 1, 40) * 2500;
    case 'number': return int(rand, 1, 40);
    case 'percent': return int(rand, 5, 95);
    case 'date': return dayOffset(int(rand, -120, 90));
    case 'checkbox': return rand() > 0.65;
    case 'email': return `${['dana', 'yossi', 'michal', 'ron'][int(rand, 0, 3)]}@example.com`;
    case 'phone': return `05${int(rand, 0, 9)}-${int(rand, 1000000, 9999999)}`;
    case 'url': return 'https://example.com';
    case 'person': return field.by === 'name' ? pick(rand, PEOPLE) : context.ownerEmail;
    case 'relation': return '';
    case 'textarea': return '';
    default: {
      // Free text: the customer-facing keys get a customer, everything else a
      // short phrase, so records read like records rather than like lorem.
      if (/company|client_name|customer|supplier|site/.test(field.key)) return context.customer;
      if (/full_name|participant|technician|assigned_to|manager|approved_by/.test(field.key)) return pick(rand, PEOPLE);
      if (/number|sku|serial|control_id/.test(field.key)) return `${int(rand, 1000, 9999)}`;
      return `${pick(rand, WORDS)} ${context.customer}`;
    }
  }
}

/** One demo record for a schema. */
export function demoRecord(schema, index, options = {}) {
  const rand = rng((options.seed || 7) * 977 + index * 131 + schema.entity.length);
  const customer = CUSTOMERS[index % CUSTOMERS.length];
  const context = { customer, ownerEmail: options.ownerEmail || 'admin@localhost' };

  const record = { [DEMO_FLAG]: true };
  for (const field of schema.fields || []) {
    if (isDerived(field)) continue;
    // Optional free-text notes stay empty: filling every field makes a demo
    // look generated rather than lived-in.
    if (field.type === 'textarea' && !field.required) continue;
    record[field.key] = valueFor(field, rand, context);
  }
  // The title must be recognisable at a glance, whatever the schema calls it.
  if (schema.titleField && !record[schema.titleField]) {
    record[schema.titleField] = `${pick(rand, WORDS)} ${customer}`;
  }
  return record;
}

/** How many records each module gets — enough to fill a screen, not a page. */
export const DEMO_COUNT = 6;

/**
 * The full demo set for the modules present in this build.
 * `allowed` limits it further to the modules the wizard actually kept open.
 */
export function demoDataFor(moduleIds, options = {}) {
  const byEntity = {};
  for (const id of moduleIds) {
    const schema = CRM_SCHEMAS[id];
    if (!schema) continue;
    byEntity[schema.entity] = Array.from(
      { length: DEMO_COUNT },
      (_, i) => demoRecord(schema, i, options)
    );
  }
  return byEntity;
}

export const isDemoRecord = (record) => record?.[DEMO_FLAG] === true;

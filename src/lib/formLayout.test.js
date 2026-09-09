import { describe, it, expect } from 'vitest';
import {
  LAYOUT_START, LAYOUT_END, layoutSlots, trailingFields, hasPlacedFields, placeField, formFieldsOf,
} from './customFields';

// A small stand-in for a schema's fields: name, amount, notes.
const FORM = [
  { key: 'name', label: 'שם' },
  { key: 'amount', label: 'סכום' },
  { key: 'notes', label: 'הערות' },
];

const custom = (over = {}) => ({ id: 'c1', key: 'po', label: 'מספר הזמנה', type: 'text', order: 0, ...over });

describe('where a custom field sits', () => {
  it('puts a field with no position at the end, exactly as before', () => {
    const slots = layoutSlots(FORM, [custom()]);
    expect(slots[slots.length - 1].custom.map((f) => f.id)).toEqual(['c1']);
    expect(trailingFields(FORM, [custom()])).toHaveLength(1);
    expect(hasPlacedFields(FORM, [custom()])).toBe(false);
  });

  it('puts a placed field after the built-in field it names', () => {
    const slots = layoutSlots(FORM, [custom({ after: 'amount' })]);
    const amount = slots.find((s) => s.key === 'amount');
    expect(amount.custom.map((f) => f.id)).toEqual(['c1']);
    expect(trailingFields(FORM, [custom({ after: 'amount' })])).toEqual([]);
    expect(hasPlacedFields(FORM, [custom({ after: 'amount' })])).toBe(true);
  });

  it('can put a field before everything else', () => {
    const slots = layoutSlots(FORM, [custom({ after: LAYOUT_START })]);
    expect(slots[0].key).toBe(LAYOUT_START);
    expect(slots[0].custom.map((f) => f.id)).toEqual(['c1']);
  });

  it('returns a slot for every built-in field, plus a start and an end', () => {
    const slots = layoutSlots(FORM, []);
    expect(slots.map((s) => s.key)).toEqual([LAYOUT_START, 'name', 'amount', 'notes', LAYOUT_END]);
  });

  it('does not lose a field pinned to something the schema no longer has', () => {
    // The built-in field was renamed or removed in a later version.
    const slots = layoutSlots(FORM, [custom({ after: 'legacy_column' })]);
    expect(slots[slots.length - 1].custom.map((f) => f.id)).toEqual(['c1']);
  });

  it('keeps two fields in the same slot in their stored order', () => {
    const fields = [
      custom({ id: 'b', label: 'שני', after: 'amount', order: 2 }),
      custom({ id: 'a', label: 'ראשון', after: 'amount', order: 1 }),
    ];
    const amount = layoutSlots(FORM, fields).find((s) => s.key === 'amount');
    expect(amount.custom.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('leaves a hidden field out of the form entirely', () => {
    const slots = layoutSlots(FORM, [custom({ hidden: true, after: 'amount' })]);
    expect(slots.every((s) => s.custom.length === 0)).toBe(true);
  });

  it('answers for a form with no fields and for no custom fields at all', () => {
    expect(layoutSlots([], []).map((s) => s.key)).toEqual([LAYOUT_START, LAYOUT_END]);
    expect(layoutSlots(FORM).every((s) => s.custom.length === 0)).toBe(true);
  });
});

describe('dragging a field to a new position', () => {
  const fields = [
    { id: 'a', label: 'א', order: 0 },
    { id: 'b', label: 'ב', order: 1 },
    { id: 'c', label: 'ג', order: 2 },
  ];

  it('records the new anchor', () => {
    const changes = placeField(fields, 'b', 'amount');
    const moved = changes.find((c) => c.id === 'b');
    expect(moved.after).toBe('amount');
  });

  it('writes only what actually moved', () => {
    const changes = placeField(fields, 'c', 'amount');
    // 'c' was already last; only its anchor changed.
    expect(changes.map((c) => c.id)).toEqual(['c']);
  });

  it('renumbers so the stored order matches what is shown', () => {
    const changes = placeField(fields, 'a', 'amount');
    const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
    // 'b' and 'c' close the gap 'a' left behind.
    expect(byId.b.order).toBe(0);
    expect(byId.c.order).toBe(1);
    expect(byId.a.order).toBe(2);
  });

  it('drops into a chosen position within the slot, not always at the end', () => {
    const placed = [
      { id: 'x', after: 'amount', order: 0 },
      { id: 'y', after: 'amount', order: 1 },
      { id: 'z', order: 2 },
    ];
    const changes = placeField(placed, 'z', 'amount', 0);
    const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
    expect(byId.z.order).toBe(0);
    expect(byId.x.order).toBe(1);
    expect(byId.y.order).toBe(2);
  });

  it('clamps a position that does not exist rather than throwing', () => {
    expect(() => placeField(fields, 'a', 'amount', 99)).not.toThrow();
    expect(() => placeField(fields, 'a', 'amount', -5)).not.toThrow();
  });

  it('says nothing happened when the field is not one of these', () => {
    expect(placeField(fields, 'nope', 'amount')).toEqual([]);
  });

  it('round-trips: what placeField writes is what layoutSlots reads back', () => {
    let list = [{ id: 'a', label: 'א', order: 0 }, { id: 'b', label: 'ב', order: 1 }];
    const changes = placeField(list, 'b', 'name');
    list = list.map((f) => ({ ...f, ...(changes.find((c) => c.id === f.id) || {}) }));

    const slots = layoutSlots(FORM, list);
    expect(slots.find((s) => s.key === 'name').custom.map((f) => f.id)).toEqual(['b']);
    expect(slots[slots.length - 1].custom.map((f) => f.id)).toEqual(['a']);
  });
});

describe('which form an entity has', () => {
  it('describes the three entities that predate the schema engine', () => {
    // Without these the editor had nothing to place against and showed an
    // empty box — and a task is the first thing anyone adds a field to.
    for (const entity of ['Task', 'SupportTicket', 'Project']) {
      expect(formFieldsOf(entity).length, entity).toBeGreaterThan(0);
    }
  });

  it('reads a schema-driven module straight from its schema', () => {
    const leadKeys = formFieldsOf('Lead').map((f) => f.key);
    expect(leadKeys).toContain('name');
    expect(leadKeys).toContain('value');
  });

  it('leaves derived columns out — nothing can sit after a number nobody types', () => {
    // weighted_value is computed from stage and value.
    expect(formFieldsOf('Lead').map((f) => f.key)).not.toContain('weighted_value');
  });

  it('gives every anchor a key and a label to show', () => {
    for (const entity of ['Task', 'SupportTicket', 'Project', 'Lead', 'Invoice']) {
      for (const field of formFieldsOf(entity)) {
        expect(field.key, entity).toBeTruthy();
        expect(field.label, `${entity}.${field.key}`).toBeTruthy();
      }
    }
  });

  it('says an entity it has never heard of has no form, rather than throwing', () => {
    expect(formFieldsOf('NotARecord')).toEqual([]);
    expect(formFieldsOf(undefined)).toEqual([]);
  });

  it('places a task field against the anchors the task form actually renders', () => {
    const field = { id: 'c1', label: 'תעדוף מנהל', order: 0, after: 'priority' };
    const slot = layoutSlots(formFieldsOf('Task'), [field]).find((s) => s.key === 'priority');
    expect(slot).toBeTruthy();
    expect(slot.custom.map((f) => f.id)).toEqual(['c1']);
  });
});

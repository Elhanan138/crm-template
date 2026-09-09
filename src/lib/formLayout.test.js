import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveLayout, moveInLayout, isCustomised, orderFor } from './formLayout';
import { formFieldsOf } from './customFields';

const keysOf = (items) => items.map((i) => i.key);

const custom = (over = {}) => ({ id: 'c1', key: 'po', label: 'מספר הזמנה', type: 'text', order: 0, ...over });

describe('the order a form is asked in', () => {
  it('is the form as written, then the custom fields, until someone changes it', () => {
    const natural = keysOf(resolveLayout('Task', [custom()], []));
    expect(natural).toEqual([...formFieldsOf('Task').map((f) => f.key), 'po']);
  });

  it('follows a stored order exactly', () => {
    const order = ['po', 'status', 'title'];
    const items = keysOf(resolveLayout('Task', [custom()], order));
    expect(items.slice(0, 3)).toEqual(order);
  });

  it('moves built-in fields too, not only custom ones', () => {
    const items = keysOf(resolveLayout('Task', [], ['status', 'title']));
    expect(items[0]).toBe('status');
    expect(items[1]).toBe('title');
  });

  it('marks which entry is which, so a form knows how to render it', () => {
    const items = resolveLayout('Task', [custom()], []);
    expect(items.find((i) => i.key === 'title').kind).toBe('builtin');
    expect(items.find((i) => i.key === 'po').kind).toBe('custom');
    expect(items.find((i) => i.key === 'po').field.label).toBe('מספר הזמנה');
  });

  it('skips a stored key for a field that no longer exists', () => {
    const items = keysOf(resolveLayout('Task', [], ['status', 'a_field_we_removed', 'title']));
    expect(items).not.toContain('a_field_we_removed');
    expect(items.slice(0, 2)).toEqual(['status', 'title']);
  });

  it('keeps a field added since the order was stored', () => {
    // The stored order predates the custom field entirely.
    const order = formFieldsOf('Task').map((f) => f.key);
    const items = keysOf(resolveLayout('Task', [custom()], order));
    expect(items).toContain('po');
    expect(items).toHaveLength(order.length + 1);
  });

  it('puts a field the stored order never mentioned at the end, where it can be seen', () => {
    // An upgrade adds fields to a form whose stored order predates them.
    // Guessing a position in the middle would silently rearrange a form
    // somebody had already arranged.
    const order = ['title', 'priority'];
    const items = keysOf(resolveLayout('Task', [], order));
    expect(items.slice(0, 2)).toEqual(order);
    expect(items).toContain('status');
    expect(items.indexOf('status')).toBeGreaterThan(1);
  });

  it('ignores a key repeated in the stored order', () => {
    const items = keysOf(resolveLayout('Task', [], ['title', 'title', 'status']));
    expect(items.filter((k) => k === 'title')).toHaveLength(1);
  });

  it('leaves a hidden custom field out of the form entirely', () => {
    expect(keysOf(resolveLayout('Task', [custom({ hidden: true })], []))).not.toContain('po');
  });

  it('answers for an entity it has never heard of rather than throwing', () => {
    expect(resolveLayout('NotARecord', [], [])).toEqual([]);
    expect(resolveLayout('Task', undefined, undefined).length).toBeGreaterThan(0);
  });
});

describe('moving a field', () => {
  const items = ['a', 'b', 'c', 'd'].map((key) => ({ key }));

  it('moves a field down to the gap that was clicked', () => {
    // Gap 3 is between 'c' and 'd'.
    expect(moveInLayout(items, 'a', 3)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a field up to the gap that was clicked', () => {
    expect(moveInLayout(items, 'd', 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('takes a field to the very top and to the very bottom', () => {
    expect(moveInLayout(items, 'c', 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveInLayout(items, 'a', 4)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('is a no-op when the field is dropped back where it already was', () => {
    expect(moveInLayout(items, 'b', 1)).toEqual(['a', 'b', 'c', 'd']);
    expect(moveInLayout(items, 'b', 2)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('clamps a gap outside the list instead of dropping the field', () => {
    expect(moveInLayout(items, 'a', 99)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveInLayout(items, 'd', -5)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('never loses or duplicates a field, wherever it is dropped', () => {
    for (let gap = 0; gap <= items.length; gap += 1) {
      for (const key of ['a', 'b', 'c', 'd']) {
        const next = moveInLayout(items, key, gap);
        expect(next).toHaveLength(4);
        expect(new Set(next).size).toBe(4);
      }
    }
  });

  it('says nothing happened for a key that is not in the list', () => {
    expect(moveInLayout(items, 'zz', 2)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('round-trips: what moveInLayout writes is what resolveLayout reads back', () => {
    const start = resolveLayout('Task', [custom()], []);
    const next = moveInLayout(start, 'po', 0);
    expect(keysOf(resolveLayout('Task', [custom()], next))[0]).toBe('po');
  });
});

describe('telling a changed order from the original', () => {
  it('says nothing was changed when there is no stored order', () => {
    expect(isCustomised('Task', [custom()], [])).toBe(false);
    expect(isCustomised('Task', [custom()], undefined)).toBe(false);
  });

  it('says nothing was changed when the stored order matches the natural one', () => {
    const natural = keysOf(resolveLayout('Task', [custom()], []));
    expect(isCustomised('Task', [custom()], natural)).toBe(false);
  });

  it('notices a real change', () => {
    const natural = keysOf(resolveLayout('Task', [custom()], []));
    const moved = moveInLayout(natural.map((key) => ({ key })), 'po', 0);
    expect(isCustomised('Task', [custom()], moved)).toBe(true);
  });
});

describe('finding the order for one entity', () => {
  const layouts = [
    { entity: 'Task', order: ['status', 'title'] },
    { entity: 'Lead', order: ['value'] },
  ];

  it('picks the right record', () => {
    expect(orderFor(layouts, 'Task')).toEqual(['status', 'title']);
    expect(orderFor(layouts, 'Lead')).toEqual(['value']);
  });

  it('reports no order rather than throwing, for an entity with none', () => {
    expect(orderFor(layouts, 'Invoice')).toEqual([]);
    expect(orderFor(undefined, 'Task')).toEqual([]);
  });
});

describe('which fields a form has', () => {
  it('describes the three entities that predate the schema engine', () => {
    for (const entity of ['Task', 'SupportTicket', 'Project']) {
      expect(formFieldsOf(entity).length, entity).toBeGreaterThan(0);
    }
  });

  it('reads a schema-driven module straight from its schema', () => {
    const leadKeys = formFieldsOf('Lead').map((f) => f.key);
    expect(leadKeys).toContain('name');
    expect(leadKeys).toContain('value');
  });

  it('leaves derived columns out — nothing to place for a number nobody types', () => {
    expect(formFieldsOf('Lead').map((f) => f.key)).not.toContain('weighted_value');
  });

  it('gives every entry a key and a label to show', () => {
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
});

describe('the preview and the form are the same code', () => {
  // A preview drawn separately is correct on the day it is written and wrong
  // the first time either side changes. These check the wiring that prevents
  // that, since a rendering test cannot prove two screens look alike.
  const read = (path) => readFileSync(path, 'utf8');

  const PAIRS = [
    ['src/components/crm/CrmRecordSheet.jsx', 'CrmFormFields'],
    ['src/components/tasks/TaskEditSheet.jsx', 'TaskFormFields'],
    ['src/components/support/SupportForm.jsx', 'SupportFormFields'],
    ['src/components/project/wizard/Step1General.jsx', 'ProjectFormFields'],
  ];

  it('has every form render its fields through the shared renderer', () => {
    for (const [form, renderer] of PAIRS) {
      expect(read(form), `${form} should render <${renderer}>`).toContain(`<${renderer}`);
    }
  });

  it('has the preview render those very same renderers', () => {
    const preview = read('src/components/settings/FormPreview.jsx');
    for (const [, renderer] of PAIRS) {
      expect(preview, `preview should render <${renderer}>`).toContain(`<${renderer}`);
    }
  });

  it('leaves no form drawing its own fields inline any more', () => {
    for (const [form] of PAIRS) {
      // The tell-tale of a hand-rolled second copy: a local block map.
      expect(read(form), `${form} still declares its own blocks`).not.toMatch(/const blocks = \{/);
    }
  });

  it('gives custom fields no heading and no section of their own', () => {
    // A custom field is a question on the form, not an appendix to it.
    for (const [form] of PAIRS) {
      expect(read(form), `${form} still labels a custom-fields section`).not.toContain('שדות נוספים');
    }
  });
});

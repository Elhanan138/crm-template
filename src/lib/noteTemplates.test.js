import { describe, it, expect } from 'vitest';
import { NOTE_TEMPLATES, noteTemplate } from './noteTemplates';
import { docToMarkdown, docToPlainText, isDocEmpty } from './notionDoc';
import { EN } from './i18n/dictionary';

describe('a note template is a real document', () => {
  it.each(NOTE_TEMPLATES.map((t) => [t.id, t]))('%s', (_id, tpl) => {
    expect(tpl.doc.type).toBe('doc');
    expect(isDocEmpty(tpl.doc)).toBe(false);
    expect(docToPlainText(tpl.doc).length).toBeGreaterThan(0);
    expect(tpl.icon).toBeTruthy();
    expect(EN[tpl.label], `"${tpl.label}" has no English`).toBeTruthy();
  });

  it('finds a template by id, and nothing for an unknown one', () => {
    expect(noteTemplate('meeting').label).toBeTruthy();
    expect(noteTemplate('nope')).toBeNull();
  });
});

describe('a note leaves as Markdown', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'החלטות' }] },
      { type: 'paragraph', content: [
        { type: 'text', text: 'חשוב', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' ו' },
        { type: 'text', text: 'קישור', marks: [{ type: 'link', attrs: { href: 'https://x.io' } }] },
      ] },
      { type: 'bulletList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'א' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ב' }] }] },
      ] },
      { type: 'taskList', content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'בוצע' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'פתוח' }] }] },
      ] },
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ראשון' }] }] },
      ] },
      { type: 'horizontalRule' },
    ],
  };

  it('writes headings, marks, links, lists and task lists the way Markdown reads them', () => {
    const md = docToMarkdown(doc, 'פגישה');
    expect(md.startsWith('# פגישה\n\n## החלטות')).toBe(true);
    expect(md).toContain('**חשוב** ו[קישור](https://x.io)');
    expect(md).toContain('- א\n- ב');
    expect(md).toContain('- [x] בוצע\n- [ ] פתוח');
    expect(md).toContain('1. ראשון');
    expect(md).toContain('---');
  });

  it('survives an empty or broken document', () => {
    expect(docToMarkdown(null, 'כותרת')).toBe('# כותרת\n');
    expect(docToMarkdown({ type: 'doc' })).toBe('\n');
  });

  it('exports every template without losing its headings', () => {
    for (const tpl of NOTE_TEMPLATES) {
      const headings = tpl.doc.content.filter((n) => n.type === 'heading').length;
      expect((docToMarkdown(tpl.doc).match(/^## /gm) || []).length).toBe(headings);
    }
  });
});

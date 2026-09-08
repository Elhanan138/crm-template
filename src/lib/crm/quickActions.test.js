import { describe, it, expect } from 'vitest';
import { quickActionsFor, matchesAction } from './quickActions';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';
import { searchTextsOf, docText, CRM_SEARCH_SOURCES } from './searchSources';
import { CRM_SCHEMAS } from './schemas';
import {
  rememberSearch, recentSearches, clearSearches,
  rememberRecord, recentRecords, clearRecords,
} from '@/lib/recentActivity';

describe('quick actions', () => {
  const actions = quickActionsFor();

  it('only offers actions for modules this build contains', () => {
    for (const action of actions) {
      const id = action.id.split(':')[1];
      expect(ACTIVE_MODULE_IDS, `${id} is not in this build`).toContain(id);
      expect(MODULES[id]).toBeTruthy();
    }
  });

  it('sends every action somewhere real', () => {
    for (const action of actions) {
      expect(action.path.startsWith('/')).toBe(true);
      expect(action.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('opens the create form through the page, not a route of its own', () => {
    const create = actions.filter((a) => a.id.startsWith('create:') && !a.id.endsWith('projects'));
    expect(create.length).toBeGreaterThan(0);
    for (const action of create) expect(action.path).toContain('?new=1');
  });

  it('matches on what the label says, and matches everything when nothing is typed', () => {
    const sample = { label: 'חדש — ליד' };
    expect(matchesAction(sample, '')).toBe(true);
    expect(matchesAction(sample, 'ליד')).toBe(true);
    expect(matchesAction(sample, 'חשבונית')).toBe(false);
  });
});

describe('searching inside content', () => {
  it('includes long-form fields as secondary text, never as the title', () => {
    const source = CRM_SEARCH_SOURCES.find((s) => s.moduleId === 'leads');
    const record = { name: 'הזדמנות', notes: 'הלקוח ביקש הצעה מעודכנת' };
    const { primary, secondary } = searchTextsOf(source, record);
    expect(primary).toBe('הזדמנות');
    expect(secondary).toContain('הלקוח ביקש הצעה מעודכנת');
  });

  it('declares a body field for every schema that has one', () => {
    for (const source of CRM_SEARCH_SOURCES) {
      const expected = CRM_SCHEMAS[source.moduleId].fields
        .filter((f) => f.type === 'textarea').map((f) => f.key);
      expect(source.bodyFields).toEqual(expected);
    }
  });

  it('flattens a rich-text document to searchable text', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'סיכום פגישת אפיון' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'הוחלט על שלב פיילוט' }] },
      ],
    };
    expect(docText(doc)).toContain('שלב פיילוט');
  });

  it('never throws on a document it cannot read', () => {
    expect(docText(null)).toBe('');
    expect(docText('not a doc')).toBe('');
    expect(docText({ content: 'wrong shape' })).toBe('');
  });
});

describe('recent activity', () => {
  it('keeps the newest first and never repeats a query', () => {
    clearSearches();
    rememberSearch('אקמה');
    rememberSearch('בלוסום');
    rememberSearch('אקמה');
    expect(recentSearches()).toEqual(['אקמה', 'בלוסום']);
  });

  it('ignores a query too short to be worth remembering', () => {
    clearSearches();
    rememberSearch('א');
    rememberSearch('   ');
    expect(recentSearches()).toEqual([]);
  });

  it('caps the history rather than growing forever', () => {
    clearSearches();
    for (let i = 0; i < 12; i += 1) rememberSearch(`query ${i}`);
    expect(recentSearches()).toHaveLength(5);
    expect(recentSearches()[0]).toBe('query 11');
  });

  it('moves a reopened record to the front instead of duplicating it', () => {
    clearRecords();
    rememberRecord({ id: '1', type: 'crm:leads', label: 'A', path: '/leads?recordId=1' });
    rememberRecord({ id: '2', type: 'crm:leads', label: 'B', path: '/leads?recordId=2' });
    rememberRecord({ id: '1', type: 'crm:leads', label: 'A', path: '/leads?recordId=1' });
    expect(recentRecords().map((r) => r.id)).toEqual(['1', '2']);
  });

  it('refuses an entry that could not be navigated to', () => {
    clearRecords();
    rememberRecord({ label: 'no id' });
    rememberRecord({ id: '9' });
    expect(recentRecords()).toEqual([]);
  });
});

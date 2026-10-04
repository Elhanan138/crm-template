import { describe, it, expect, beforeEach } from 'vitest';
import { WHATS_NEW, unseenEntries, moduleHasNews, markModuleSeen, moduleForPath } from './whatsNew';
import { MODULE_IDS } from './modules';
import { EN } from './i18n/dictionary';

beforeEach(() => localStorage.clear());

describe('what is new, per person', () => {
  it('shows everything to someone who has opened nothing', () => {
    expect(unseenEntries()).toHaveLength(WHATS_NEW.length);
  });

  it('clears a module\'s entries once it is opened, and only that module\'s', () => {
    const before = unseenEntries().length;
    const proposals = WHATS_NEW.filter((e) => e.module === 'proposals').length;
    expect(moduleHasNews('proposals')).toBe(true);
    markModuleSeen('proposals');
    expect(moduleHasNews('proposals')).toBe(false);
    expect(unseenEntries()).toHaveLength(before - proposals);
    expect(moduleHasNews('invoices')).toBe(true);
  });

  it('says nothing for a module with no entries', () => {
    expect(moduleHasNews('dashboard')).toBe(false);
    expect(() => markModuleSeen('dashboard')).not.toThrow();
  });
});

describe('a path is mapped to the module that owns it', () => {
  it('reads the manifest\'s own routes, longest match first', () => {
    expect(moduleForPath('/')).toBe('dashboard');
    expect(moduleForPath('/invoices')).toBe('invoices');
    expect(moduleForPath('/projects/acme/edit')).toBe('projects');
    expect(moduleForPath('/nowhere')).toBeNull();
  });
});

describe('every entry is real', () => {
  it.each(WHATS_NEW.map((e) => [e.id, e]))('%s', (_id, entry) => {
    expect(MODULE_IDS).toContain(entry.module);
    expect(EN[entry.title], entry.title).toBeTruthy();
    expect(EN[entry.body], entry.body).toBeTruthy();
  });

  it('has unique ids, so "seen" means one thing', () => {
    const ids = WHATS_NEW.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readCollapsed, writeCollapsed, DEFAULT_COLLAPSED } from './sidebarPrefs';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('the sidebar remembers how wide it was', () => {
  it('starts as an icon rail on a browser that has never been here', () => {
    expect(readCollapsed()).toBe(true);
    expect(DEFAULT_COLLAPSED).toBe(true);
  });

  it('keeps a choice to widen it — the bug was that it did not', () => {
    writeCollapsed(false);
    expect(readCollapsed()).toBe(false);
    writeCollapsed(true);
    expect(readCollapsed()).toBe(true);
  });

  it('falls back to the default for a stored value it cannot read', () => {
    for (const junk of ['', 'yes', 'null', '{}', '1']) {
      localStorage.setItem('sidebar_collapsed', junk);
      expect(readCollapsed(), junk).toBe(DEFAULT_COLLAPSED);
    }
  });

  // A private window, cleared site data or blocked storage throws on access.
  // A sidebar is not worth a blank screen.
  it('survives storage that throws, on read and on write alike', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => writeCollapsed(false)).not.toThrow();
    expect(readCollapsed()).toBe(DEFAULT_COLLAPSED);
  });
});

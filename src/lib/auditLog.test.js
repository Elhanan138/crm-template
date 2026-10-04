import { describe, it, expect, beforeEach } from 'vitest';
import {
  AUDIT_ENTITY, AUDIT_AREAS, areaMeta, describeValue,
  recordAudit, sortAudit, matchesAudit, auditToCsv,
} from './auditLog';
import { api } from '@/api/client';
import { SETTINGS_CATALOG, SETTINGS_SECTION_IDS, ADMIN_SECTIONS, SETTINGS_PANEL_PATHS } from './settingsCatalog';
import { SETTINGS_PANEL_FILES } from '../../tools/export-core.js';

beforeEach(() => localStorage.clear());

describe('the settings catalog is the only list', () => {
  it('names every section once', () => {
    expect(new Set(SETTINGS_SECTION_IDS).size).toBe(SETTINGS_SECTION_IDS.length);
  });

  it('gives every section a label, a hint, an icon and a panel', () => {
    for (const section of SETTINGS_CATALOG) {
      expect(section.label.trim().length, section.id).toBeGreaterThan(0);
      expect(section.hint.trim().length, section.id).toBeGreaterThan(0);
      expect(section.icon.trim().length, section.id).toBeGreaterThan(0);
      expect(section.panel.endsWith('Panel'), section.id).toBe(true);
    }
  });

  it('is what the export planner carries, with no second map to forget', () => {
    expect(SETTINGS_PANEL_FILES).toEqual(SETTINGS_PANEL_PATHS);
    for (const section of SETTINGS_CATALOG) {
      expect(SETTINGS_PANEL_FILES[section.id]).toBe(`src/components/settings/${section.panel}.jsx`);
    }
  });

  it('separates the tabs of their own from the admin sub-sections', () => {
    expect(ADMIN_SECTIONS.every((s) => !s.topLevel)).toBe(true);
    expect(ADMIN_SECTIONS.length).toBeLessThan(SETTINGS_CATALOG.length);
  });
});

describe('audit areas', () => {
  it('uses only tones the badge can render', () => {
    const tones = new Set(['neutral', 'success', 'warning', 'info', 'destructive', 'accent']);
    for (const area of AUDIT_AREAS) expect(tones.has(area.tone), area.value).toBe(true);
  });

  it('names an area it has never seen rather than rendering blank', () => {
    expect(areaMeta('whatever').label).toBe('whatever');
    expect(areaMeta('users').label).toBe('משתמשים והרשאות');
  });
});

describe('how a value reads in the log', () => {
  it('turns a switch into words', () => {
    expect(describeValue(true)).toBe('פעיל');
    expect(describeValue(false)).toBe('כבוי');
  });

  it('marks an absent value rather than printing "undefined"', () => {
    expect(describeValue(undefined)).toBe('—');
    expect(describeValue(null)).toBe('—');
    expect(describeValue('')).toBe('—');
    expect(describeValue([])).toBe('—');
  });

  it('keeps lists and numbers readable', () => {
    expect(describeValue(['א', 'ב'])).toBe('א, ב');
    expect(describeValue(7)).toBe('7');
  });
});

describe('writing to the log', () => {
  it('records who did what, and stamps the actor from the session', async () => {
    const ok = await recordAudit({ area: 'users', action: 'שינוי הרשאת אדמין', target: 'a@b.c', before: false, after: true });
    expect(ok).toBe(true);

    const rows = await api.entities[AUDIT_ENTITY].list();
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('שינוי הרשאת אדמין');
    expect(rows[0].before).toBe('כבוי');
    expect(rows[0].after).toBe('פעיל');
    expect(rows[0].created_date).toBeTruthy();
  });

  it('never lets a failed log entry break the action it describes', async () => {
    const original = api.entities[AUDIT_ENTITY].create;
    api.entities[AUDIT_ENTITY].create = () => { throw new Error('storage full'); };
    await expect(recordAudit({ area: 'users', action: 'משהו' })).resolves.toBe(false);
    api.entities[AUDIT_ENTITY].create = original;
  });
});

describe('reading the log back', () => {
  const rows = [
    { id: '1', created_date: '2026-09-01T10:00:00.000Z', area: 'users', action: 'הוספת משתמש', target: 'dana@example.com', actor_name: 'אדמין' },
    { id: '2', created_date: '2026-09-03T10:00:00.000Z', area: 'branding', action: 'איפוס מיתוג', target: '', actor_name: 'אדמין' },
    { id: '3', created_date: '2026-09-02T10:00:00.000Z', area: 'export', action: 'הורדת חבילת ייצוא', target: '5 מודולים', actor_name: 'אדמין' },
  ];

  it('reads newest first', () => {
    expect(sortAudit(rows).map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('matches on anything the line says, including the area label', () => {
    expect(matchesAudit(rows[0], 'dana')).toBe(true);
    expect(matchesAudit(rows[0], 'משתמשים')).toBe(true);
    expect(matchesAudit(rows[0], 'מיתוג')).toBe(false);
    expect(matchesAudit(rows[0], '  ')).toBe(true);
  });

  it('exports a CSV Excel opens as Hebrew, in the order it is read', () => {
    const csv = auditToCsv(rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('תאריך');
    expect(lines[1]).toContain('איפוס מיתוג');
  });

  it('quotes a value that contains a comma instead of splitting the row', () => {
    const csv = auditToCsv([{ id: '1', area: 'users', action: 'עדכון', target: 'א, ב' }]);
    expect(csv).toContain('"א, ב"');
  });
});

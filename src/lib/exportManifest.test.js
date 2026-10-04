import { describe, it, expect, beforeEach } from 'vitest';
import { hashFiles, exportVersion, changelogFor, describePlan } from '../../tools/export-manifest.js';
import { planInBrowser } from './browserExport';
import { currentBuild, advanceBuild, resetBuild } from './exportBuild';
import { ACTIVE_MODULE_IDS } from './moduleRegistry';

describe('bundle version', () => {
  it('carries the source semver plus the build that produced it', () => {
    expect(exportVersion('1.4.2', 7)).toBe('1.4.2+build.7');
  });

  it('falls back to a real version rather than emitting an unusable one', () => {
    expect(exportVersion(undefined, 1)).toBe('0.0.0+build.1');
    expect(exportVersion('not-a-version', 1)).toBe('0.0.0+build.1');
    expect(exportVersion('1.0.0', 0)).toBe('1.0.0+build.1');
    expect(exportVersion('1.0.0', -3)).toBe('1.0.0+build.1');
  });
});

describe('source fingerprint', () => {
  const files = (entries) => new Map(entries);

  it('is the same for the same contents, whatever order they arrived in', () => {
    const a = files([['a.js', 'one'], ['b.js', 'two']]);
    const b = files([['b.js', 'two'], ['a.js', 'one']]);
    expect(hashFiles(a)).toBe(hashFiles(b));
  });

  it('changes when a file changes, and when a file is added', () => {
    const base = files([['a.js', 'one']]);
    expect(hashFiles(files([['a.js', 'ONE']]))).not.toBe(hashFiles(base));
    expect(hashFiles(files([['a.js', 'one'], ['b.js', 'two']]))).not.toBe(hashFiles(base));
  });

  it('counts the binary assets that are copied rather than written', () => {
    const base = files([['a.js', 'one']]);
    expect(hashFiles(base, ['public/logo.png'])).not.toBe(hashFiles(base, []));
  });

  it('ignores the two files that describe the bundle, so it stays reproducible', () => {
    const bare = files([['a.js', 'one']]);
    const described = files([
      ['a.js', 'one'],
      ['EXPORT.json', '{"version":"1.0.0+build.1"}'],
      ['CHANGELOG.md', '# יומן שינויים'],
    ]);
    expect(hashFiles(described)).toBe(hashFiles(bare));
  });
});

describe('changelog', () => {
  const meta = {
    version: '1.0.0+build.3',
    sourceHash: 'deadbeef',
    exportedAt: '2026-09-09T08:00:00.000Z',
    modules: ['leads', 'invoices'],
    features: ['agent'],
    settingsSections: ['users'],
    files: 210,
    devTools: false,
    blankTemplate: true,
    droppedDependencies: ['jszip'],
  };

  it('states what this particular bundle is', () => {
    const text = changelogFor(meta);
    expect(text).toContain('1.0.0+build.3');
    expect(text).toContain('2026-09-09');
    expect(text).toContain('leads, invoices');
    expect(text).toContain('210');
    expect(text).toContain('deadbeef');
    expect(text).toContain('תבנית ריקה');
  });

  it('says nothing rather than printing an empty list', () => {
    expect(changelogFor({ ...meta, features: [] })).toContain('תכונות: —');
  });
});

describe('export preview', () => {
  it('describes exactly the plan the archive is built from', () => {
    const keep = ACTIVE_MODULE_IDS.slice(0, 2);
    const { meta, textFiles } = planInBrowser({ modules: keep, build: 4 });
    const preview = describePlan(meta, { allModules: ACTIVE_MODULE_IDS, allSections: ['users', 'branding'] });

    expect(preview.modules).toEqual(meta.modules);
    expect(preview.files).toBe(meta.files);
    expect(preview.version).toBe(meta.version);
    expect(preview.sourceHash).toBe(meta.sourceHash);
    // What the preview says will be dropped is the complement of what is kept.
    expect(preview.droppedModules).toEqual(ACTIVE_MODULE_IDS.filter((id) => !keep.includes(id)));
    expect(textFiles.has('EXPORT.json')).toBe(true);
  });

  it('lists a settings section as dropped only when it really was', () => {
    const { meta } = planInBrowser({ settingsSections: ['users'] });
    const preview = describePlan(meta, { allModules: [], allSections: ['users', 'branding'] });
    expect(preview.droppedSections).toEqual(['branding']);
  });
});

describe('every bundle describes itself', () => {
  it('ships EXPORT.json and CHANGELOG.md that agree with each other', () => {
    const { textFiles, meta } = planInBrowser({ build: 2 });
    const exported = JSON.parse(textFiles.get('EXPORT.json'));
    expect(exported.version).toBe(meta.version);
    expect(exported.sourceHash).toBe(meta.sourceHash);
    expect(textFiles.get('CHANGELOG.md')).toContain(meta.version);
  });

  it('stamps the same version onto package.json, so the two cannot disagree', () => {
    const { textFiles, meta } = planInBrowser({ build: 5 });
    expect(JSON.parse(textFiles.get('package.json')).version).toBe(meta.version);
    expect(meta.version.endsWith('+build.5')).toBe(true);
  });

  it('produces the same fingerprint for the same selection, twice running', () => {
    const first = planInBrowser({ modules: ACTIVE_MODULE_IDS.slice(0, 3), build: 1 });
    const second = planInBrowser({ modules: ACTIVE_MODULE_IDS.slice(0, 3), build: 1 });
    expect(first.meta.sourceHash).toBe(second.meta.sourceHash);
  });

  it('gives a different fingerprint to a different selection', () => {
    if (ACTIVE_MODULE_IDS.length < 4) return;
    const a = planInBrowser({ modules: ACTIVE_MODULE_IDS.slice(0, 2) });
    const b = planInBrowser({ modules: ACTIVE_MODULE_IDS.slice(0, 4) });
    expect(a.meta.sourceHash).not.toBe(b.meta.sourceHash);
  });
});

describe('build counter', () => {
  beforeEach(() => resetBuild());

  it('starts at one so the first bundle is still identifiable', () => {
    expect(currentBuild()).toBe(1);
  });

  it('advances only when a bundle actually goes out', () => {
    expect(currentBuild()).toBe(1);
    expect(currentBuild()).toBe(1);
    advanceBuild();
    expect(currentBuild()).toBe(2);
  });

  it('recovers from a value that was tampered with', () => {
    localStorage.setItem('export_build_counter', 'nonsense');
    expect(currentBuild()).toBe(1);
  });
});

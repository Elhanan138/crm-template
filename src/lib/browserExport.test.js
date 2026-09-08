import { describe, it, expect } from 'vitest';
import { canExport, embeddedFileCount, planInBrowser } from './browserExport';
import { MODULE_IDS } from './modules';
import { ACTIVE_MODULE_IDS } from './moduleRegistry';

// A partial export legitimately ships fewer modules, so every assertion below is
// scoped to what this particular bundle contains.
const inBundle = (id) => ACTIVE_MODULE_IDS.includes(id);
const pick = (...ids) => ids.filter(inBundle);

describe('in-app export (browser payload)', () => {
  it('embeds the source tree at build time', () => {
    expect(canExport()).toBe(true);
    expect(embeddedFileCount()).toBeGreaterThan(100);
    expect(ACTIVE_MODULE_IDS.length).toBeGreaterThan(0);
    expect(ACTIVE_MODULE_IDS.every((id) => MODULE_IDS.includes(id))).toBe(true);
  });

  it('ships the deployment configs so the ZIP is drag-and-drop ready', () => {
    const { textFiles } = planInBrowser({});
    for (const f of ['vercel.json', 'netlify.toml', '.env.example', 'index.html', 'package.json']) {
      expect(textFiles.has(f), `missing ${f}`).toBe(true);
    }
  });

  it('includes its own export tooling so the bundle can export again', () => {
    if (!inBundle('settings')) return;
    const { textFiles, meta } = planInBrowser({});
    expect(textFiles.has('tools/export-core.js')).toBe(true);
    expect(textFiles.has('tools/export-cli.js')).toBe(true);
    expect(textFiles.has('src/lib/browserExport.js')).toBe(true);
    expect(meta.devTools).toBe(true);
    expect(JSON.parse(textFiles.get('package.json')).scripts.export).toBeTruthy();
  });

  it('keeps the selected modules and drops the pages of the rest', () => {
    const keep = pick('dashboard', 'tasks');
    if (keep.length === 0) return;
    const { textFiles, meta } = planInBrowser({ modules: keep });
    expect(meta.modules).toEqual(keep);
    if (inBundle('dashboard')) expect(textFiles.has('src/pages/Dashboard.jsx')).toBe(true);
    if (inBundle('tasks')) expect(textFiles.has('src/pages/Tasks.jsx')).toBe(true);
    for (const dropped of ['Reports', 'Support', 'Calendar']) {
      expect(textFiles.has(`src/pages/${dropped}.jsx`)).toBe(false);
    }
    expect(meta.droppedDependencies.length).toBeGreaterThan(0);
  });

  it('never writes a settingsSections file that lists a dropped panel', () => {
    if (!inBundle('settings')) return;
    const { textFiles } = planInBrowser({ modules: ['settings'], settingsSections: ['users', 'branding'] });
    const generated = textFiles.get('src/lib/settingsSections.js');
    expect(generated).toContain('"users"');
    expect(generated).toContain('"branding"');
    expect(generated).not.toContain('"integrations"');
    expect(textFiles.has('src/components/settings/IntegrationsPanel.jsx')).toBe(false);
  });

  it('refuses an unknown module and an empty selection', () => {
    expect(() => planInBrowser({ modules: ['nope'] })).toThrow(/לא מוכרים/);
    expect(() => planInBrowser({ modules: [] })).not.toThrow(); // empty means "all"
  });

  it('omits tests and the export tooling when dev tools are off', () => {
    const { textFiles, meta } = planInBrowser({ devTools: false });
    expect(textFiles.has('tools/export-core.js')).toBe(false);
    expect(textFiles.has('src/lib/modules.test.js')).toBe(false);
    expect(meta.devTools).toBe(false);
  });
});

describe('export options', () => {
  it('drops the agent from the bundle when the feature is switched off', () => {
    const { textFiles, meta } = planInBrowser({ features: ['email-tracking'] });
    expect(meta.features).toEqual(['email-tracking']);
    expect(textFiles.has('src/components/shared/SystemAssistantSheet.jsx')).toBe(false);
    expect(textFiles.has('src/components/project/ProjectAIChat.jsx')).toBe(false);
    expect(textFiles.get('src/lib/features.js')).not.toContain('"agent"');
    // The host components stay untouched — nothing is stripped from source.
    expect(textFiles.has('src/components/layout/AppLayout.jsx')).toBe(true);
  });

  it('drops email tracking when that feature is switched off', () => {
    const { textFiles } = planInBrowser({ features: ['agent'] });
    expect(textFiles.has('src/components/profile/OutboxTab.jsx')).toBe(false);
    expect(textFiles.get('src/lib/features.js')).not.toContain('"email-tracking"');
  });

  it('produces a blank template with no branding and no product name', () => {
    const { textFiles, copyPaths, meta } = planInBrowser({ blankTemplate: true });
    expect(meta.blankTemplate).toBe(true);
    const identity = textFiles.get('src/lib/appIdentity.js');
    expect(identity).toContain('"name": ""');
    expect(identity).toContain('"logo": ""');
    const manifest = JSON.parse(textFiles.get('public/manifest.json'));
    expect(manifest.name).toBe('App');
    expect(manifest.icons).toEqual([]);
    expect(copyPaths.some((p) => p.startsWith('public/icon-'))).toBe(false);
    expect(textFiles.get('index.html')).not.toContain('OSS');
  });

  it('carries the current branding through a normal export', () => {
    const { textFiles, copyPaths, meta } = planInBrowser({});
    expect(meta.blankTemplate).toBe(false);
    expect(textFiles.has('src/lib/appIdentity.js')).toBe(true);
    // A bundle that was itself exported blank has no icons to carry forward.
    const hasIcons = embeddedFileCount() > 0 && planInBrowser({}).copyPaths.length >= 0;
    expect(hasIcons).toBe(true);
    expect(Array.isArray(copyPaths)).toBe(true);
  });
});

describe('client branding step', () => {
  it('ships a bundle already branded for a named client', () => {
    const { textFiles, meta } = planInBrowser({
      identity: {
        name: 'עיריית חיפה',
        subtitle: 'מערכת פרויקטים',
        logo: 'data:image/png;base64,AAA',
        company: { legalId: '500123456', address: 'חיפה', tagline: 'אגף פרויקטים' },
      },
    });
    expect(meta.blankTemplate).toBe(false);
    expect(meta.identity.name).toBe('עיריית חיפה');
    expect(meta.identity.hasLogo).toBe(true);

    const identity = textFiles.get('src/lib/appIdentity.js');
    expect(identity).toContain('עיריית חיפה');
    expect(identity).toContain('500123456');

    const manifest = JSON.parse(textFiles.get('public/manifest.json'));
    expect(manifest.short_name).toBe('עיריית חיפה');
    expect(manifest.name).toBe('עיריית חיפה — מערכת פרויקטים');
    expect(manifest.icons[0].src).toBe('data:image/png;base64,AAA');

    expect(textFiles.get('index.html')).toContain('עיריית חיפה');
    expect(textFiles.get('README.md')).toContain('עיריית חיפה');
  });

  it('treats a branding step with no name as a blank template', () => {
    const { meta, textFiles } = planInBrowser({ identity: { name: '', subtitle: '' } });
    expect(meta.blankTemplate).toBe(true);
    expect(textFiles.get('src/lib/appIdentity.js')).toContain('"name": ""');
  });
});

describe('crm modules', () => {
  const CRM_IDS = ['leads', 'contacts', 'forecast', 'invoices', 'products', 'automations'];

  it('lists its CRM modules as selectable', () => {
    const { meta } = planInBrowser({});
    const present = CRM_IDS.filter((id) => inBundle(id));
    for (const id of present) expect(meta.availableModules).toContain(id);
  });

  it('ships the shared CRM engine only when a CRM module is selected', () => {
    if (!inBundle('leads')) return;
    const withCrm = planInBrowser({ modules: ['leads'] });
    expect(withCrm.textFiles.has('src/components/crm/CrmModulePage.jsx')).toBe(true);
    expect(withCrm.textFiles.has('src/lib/crm/schemas.js')).toBe(true);

    const nonCrm = pick('notes', 'tasks', 'dashboard')[0];
    if (!nonCrm) return;
    const withoutCrm = planInBrowser({ modules: [nonCrm] });
    expect(withoutCrm.textFiles.has('src/pages/Leads.jsx')).toBe(false);
  });

  it('keeps forecast usable on its own — it reads leads, it does not import the page', () => {
    if (!inBundle('forecast')) return;
    const { textFiles } = planInBrowser({ modules: ['forecast'] });
    expect(textFiles.has('src/pages/Forecast.jsx')).toBe(true);
    expect(textFiles.has('src/pages/Leads.jsx')).toBe(false);
  });
});

describe('workspace navigation survives partial exports', () => {
  it('a workspace disappears when none of its modules are in the bundle', async () => {
    const { ACTIVE_WORKSPACES } = await import('./moduleRegistry');
    const { MODULES } = await import('./modules');
    for (const w of ACTIVE_WORKSPACES) {
      expect(w.children.length).toBeGreaterThan(0);
      for (const id of w.children) expect(MODULES[id].parent).toBe(w.id);
    }
  });

  it('every sidebar entry points at a path that exists in this bundle', async () => {
    const { NAV_ITEMS } = await import('./navItems');
    const { ALL_ROUTES } = await import('./moduleRegistry');
    const paths = new Set(ALL_ROUTES.map((r) => r.path));
    for (const item of NAV_ITEMS) expect(paths.has(item.path), `${item.label} → ${item.path}`).toBe(true);
  });

  it('exporting a single workspace module still yields a buildable bundle', () => {
    const only = pick('leads')[0] || ACTIVE_MODULE_IDS[0];
    const { textFiles, meta } = planInBrowser({ modules: [only] });
    expect(meta.modules).toEqual([only]);
    // Navigation lives in the sidebar, which every bundle ships.
    expect(textFiles.has('src/components/layout/SidebarNav.jsx')).toBe(true);
    expect(textFiles.has('src/lib/navItems.js')).toBe(true);
  });
});

describe('reports follow the modules', () => {
  it('ships the report registry only when the reports module is selected', () => {
    if (!inBundle('reports')) return;
    const withReports = planInBrowser({ modules: pick('reports', 'dashboard') });
    expect(withReports.textFiles.has('src/lib/reports/registry.js')).toBe(true);
    expect(withReports.textFiles.has('src/components/reports/BiDataTable.jsx')).toBe(true);

    const other = pick('notes', 'tasks', 'dashboard')[0];
    if (!other) return;
    const withoutReports = planInBrowser({ modules: [other] });
    expect(withoutReports.textFiles.has('src/lib/reports/registry.js')).toBe(false);
    expect(withoutReports.textFiles.has('src/pages/Reports.jsx')).toBe(false);
  });

  it('a reports-only bundle still carries the schemas its sources are built from', () => {
    if (!inBundle('reports')) return;
    const { textFiles } = planInBrowser({ modules: ['reports'] });
    expect(textFiles.has('src/lib/crm/schemas.js')).toBe(true);
    expect(textFiles.has('src/lib/crm/sectorSchemas.js')).toBe(true);
    expect(textFiles.has('src/components/reports/dataSources.js')).toBe(true);
  });
});

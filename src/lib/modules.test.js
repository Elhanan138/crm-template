import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MODULES, CORE_ROUTES, CORE_PAGES, MODULE_IDS, WORKSPACES, WORKSPACE_IDS } from './modules';
import { NAV_ICONS } from './navIcons';

const pageExists = (page) =>
  fs.existsSync(path.resolve(process.cwd(), 'src/pages', `${page}.jsx`));

// In a partial export only the selected modules are present on disk. The manifest
// still lists them all, so scope the assertions to what this bundle actually ships.
const selectedPath = path.resolve(process.cwd(), 'selected_modules.json');
const SELECTED = fs.existsSync(selectedPath)
  ? JSON.parse(fs.readFileSync(selectedPath, 'utf-8')).modules
  : MODULE_IDS;
const ACTIVE_IDS = MODULE_IDS.filter((id) => SELECTED.includes(id));

describe('module manifest', () => {
  it('every declared page exists on disk', () => {
    const pages = [
      ...ACTIVE_IDS.flatMap((id) => MODULES[id].routes.map((r) => r.page)),
      ...CORE_ROUTES.map((r) => r.page),
      ...CORE_PAGES,
    ];
    const missing = pages.filter((p) => !pageExists(p));
    expect(missing).toEqual([]);
  });

  it('every sidebar module has an icon and a reachable navPath', () => {
    for (const id of ACTIVE_IDS) {
      const m = MODULES[id];
      if (!m.label) continue;
      expect(NAV_ICONS[m.icon], `missing icon for ${id}`).toBeTruthy();
      expect(m.routes.some((r) => r.path === m.navPath), `navPath of ${id} has no route`).toBe(true);
    }
  });

  it('route paths are unique', () => {
    const paths = [...MODULE_IDS.flatMap((id) => MODULES[id].routes.map((r) => r.path)),
      ...CORE_ROUTES.map((r) => r.path)];
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('no page is imported directly by a component (modules must not depend on pages)', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.jsx?$/.test(e.name)) continue;
        const code = fs.readFileSync(full, 'utf-8');
        if (/from\s+['"]@\/pages\//.test(code)) offenders.push(full);
      }
    };
    walk(path.resolve(process.cwd(), 'src/components'));
    expect(offenders).toEqual([]);
  });
});

describe('sidebar wiring', () => {
  const renderedGroups = () => {
    const nav = fs.readFileSync(path.resolve(process.cwd(), 'src/components/layout/SidebarNav.jsx'), 'utf-8');
    const order = nav.match(/const GROUP_ORDER = \[([^\]]+)\]/)?.[1] || '';
    return new Set([...order.matchAll(/'([^']+)'/g)].map((m) => m[1]).concat('system'));
  };

  it('every sidebar group is actually rendered', () => {
    const rendered = renderedGroups();
    const groups = [
      ...MODULE_IDS.filter((id) => !MODULES[id].parent).map((id) => MODULES[id].group),
      ...WORKSPACE_IDS.map((id) => WORKSPACES[id].group),
    ].filter(Boolean);
    expect([...new Set(groups)].filter((g) => !rendered.has(g))).toEqual([]);
  });

  it('every module either has a real parent workspace or its own sidebar group', () => {
    for (const id of MODULE_IDS) {
      const m = MODULES[id];
      if (m.parent) expect(WORKSPACE_IDS, `${id} has unknown parent`).toContain(m.parent);
      else expect(m.group, `${id} has neither parent nor group`).toBeTruthy();
    }
  });

  it('every workspace has at least one module and a usable icon', () => {
    for (const id of WORKSPACE_IDS) {
      const children = MODULE_IDS.filter((m) => MODULES[m].parent === id);
      expect(children.length, `workspace ${id} is empty`).toBeGreaterThan(0);
      expect(NAV_ICONS[WORKSPACES[id].icon], `workspace ${id} has no icon`).toBeTruthy();
    }
  });

  it('every sidebar module reaches a real page', () => {
    for (const id of ACTIVE_IDS) {
      const m = MODULES[id];
      if (!m.label) continue;
      const route = m.routes.find((r) => r.path === m.navPath);
      expect(route, `${id} navPath has no route`).toBeTruthy();
      expect(pageExists(route.page), `${id} page missing`).toBe(true);
    }
  });
});

describe('sidebar links resolve', () => {
  it('every sidebar entry and sub-entry points at a route that exists', async () => {
    const { NAV_ITEMS } = await import('./navItems');
    const { ALL_ROUTES } = await import('./moduleRegistry');
    const paths = new Set(ALL_ROUTES.map((r) => r.path));
    for (const item of NAV_ITEMS) {
      expect(paths.has(item.path), `${item.label} → ${item.path}`).toBe(true);
      for (const child of item.children || []) {
        expect(paths.has(child.path), `${item.label} / ${child.label} → ${child.path}`).toBe(true);
      }
    }
  });

  it('no sub-entry duplicates its parent link', async () => {
    const { NAV_ITEMS } = await import('./navItems');
    for (const item of NAV_ITEMS) {
      const paths = (item.children || []).map((c) => c.path);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('the sidebar does not depend on stagger animation to reveal items', () => {
    const nav = fs.readFileSync(path.resolve(process.cwd(), 'src/components/layout/SidebarNav.jsx'), 'utf-8');
    expect(nav).not.toMatch(/Stagger/);
  });
});

describe('shared controls are used consistently', () => {
  const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf-8');
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(path.resolve(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.jsx$/.test(e.name)) out.push(rel);
    }
    return out;
  };

  it('no raw <input type="date"> survives — every date uses the Hebrew picker', () => {
    const offenders = walk('src').filter((f) => /type=["']date["']/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('the person field type exists and is what owner fields use', async () => {
    const { FIELD_TYPES } = await import('./customFields');
    expect(FIELD_TYPES.map((t) => t.value)).toContain('person');
    const { CRM_SCHEMAS } = await import('./crm/schemas');
    for (const schema of Object.values(CRM_SCHEMAS)) {
      const owner = schema.fields.find((f) => f.key === 'owner_email');
      if (owner) expect(owner.type, `${schema.entity}.owner_email`).toBe('person');
    }
  });

  it('the notes placeholder is forced right-to-left', () => {
    const css = read('src/index.css');
    const block = css.slice(css.indexOf('p.is-editor-empty:first-child::before'));
    expect(block.slice(0, 300)).toMatch(/direction:\s*rtl/);
  });
});

describe('mobile navigation cannot strand an overlay', () => {
  const sidebar = () => fs.readFileSync(path.resolve(process.cwd(), 'src/components/layout/Sidebar.jsx'), 'utf-8');

  it('closes the drawer on every route change, not just on tapping a link', () => {
    expect(sidebar()).toMatch(/useEffect\(\(\) => \{ setMobileOpen\(false\); \}, \[location\.pathname\]\)/);
  });

  it('the scrim is removed by CSS state, never by an exit animation', () => {
    const src = sidebar();
    expect(src).not.toMatch(/AnimatePresence/);
    expect(src).toMatch(/pointer-events-none/);
  });

  it('restores body scroll when the drawer closes', () => {
    const src = sidebar();
    expect(src).toMatch(/document\.body\.style\.overflow = 'hidden'/);
    expect(src).toMatch(/document\.body\.style\.overflow = previous/);
  });
});

describe('every CRM page has a schema behind it', () => {
  it('no module page renders against an undefined schema', async () => {
    const { CRM_SCHEMAS } = await import('./crm/schemas');
    const pages = fs.readdirSync(path.resolve(process.cwd(), 'src/pages'));
    for (const file of pages) {
      const src = fs.readFileSync(path.resolve(process.cwd(), 'src/pages', file), 'utf-8');
      for (const [, key] of src.matchAll(/CRM_SCHEMAS\.(\w+)/g)) {
        expect(CRM_SCHEMAS[key], `${file} references CRM_SCHEMAS.${key}`).toBeTruthy();
      }
    }
  });

  it('every searchable field is a field that exists', async () => {
    const { CRM_SCHEMAS } = await import('./crm/schemas');
    for (const [key, schema] of Object.entries(CRM_SCHEMAS)) {
      const keys = new Set(schema.fields.map((f) => f.key));
      for (const field of schema.searchFields || []) {
        expect(keys.has(field), `${key} searches on missing field '${field}'`).toBe(true);
      }
      const listed = schema.fields.filter((f) => f.list).map((f) => f.key);
      expect(new Set(listed).size, `${key} lists a column twice`).toBe(listed.length);
    }
  });

  it('every schema is complete enough to render', async () => {
    const { CRM_SCHEMAS } = await import('./crm/schemas');
    for (const [key, schema] of Object.entries(CRM_SCHEMAS)) {
      expect(schema.entity, `${key}.entity`).toBeTruthy();
      expect(schema.titleField, `${key}.titleField`).toBeTruthy();
      expect(schema.fields?.length, `${key}.fields`).toBeGreaterThan(0);
      expect(schema.fields.some((f) => f.key === schema.titleField), `${key} titleField not in fields`).toBe(true);
      expect(Array.isArray(schema.filters), `${key}.filters`).toBe(true);
    }
  });
});

describe('capability switchboard covers everything', () => {
  it('lists every module and workspace in this build', async () => {
    const { buildCapabilityCatalogue } = await import('./capabilities');
    const { ACTIVE_MODULE_IDS, ACTIVE_WORKSPACES } = await import('./moduleRegistry');
    const keys = new Set(
      buildCapabilityCatalogue().flatMap((g) => [
        ...(g.parent ? [g.parent.key] : []),
        ...g.items.map((i) => i.key),
      ])
    );
    for (const id of ACTIVE_MODULE_IDS) {
      if (!MODULES[id].label) continue;
      expect(keys.has(`module:${id}`), `module:${id} not switchable`).toBe(true);
    }
    for (const w of ACTIVE_WORKSPACES) {
      expect(keys.has(`workspace:${w.id}`), `workspace:${w.id} not switchable`).toBe(true);
    }
  });

  it('never lists a surface whose feature was left out of the build', async () => {
    const { buildCapabilityCatalogue } = await import('./capabilities');
    const { isFeatureEnabled } = await import('./features');
    const keys = buildCapabilityCatalogue().flatMap((g) => g.items.map((i) => i.key));
    if (!isFeatureEnabled('agent')) {
      expect(keys).not.toContain('blossom_agent');
      expect(keys).not.toContain('project_agent');
    }
    if (!isFeatureEnabled('email-tracking')) expect(keys).not.toContain('email_tracking');
  });

  it('closed means hidden, admin means admins only', async () => {
    const { isCapabilityVisible } = await import('./capabilities');
    expect(isCapabilityVisible({ x: 'closed' }, 'x', true)).toBe(false);
    expect(isCapabilityVisible({ x: 'admin' }, 'x', false)).toBe(false);
    expect(isCapabilityVisible({ x: 'admin' }, 'x', true)).toBe(true);
    expect(isCapabilityVisible({}, 'x', false)).toBe(true);
  });

  it('the agent surfaces pass through all three gates, not only the setting', () => {
    // The build flag, the server requirement and the administrator's switch are
    // all asked by useCapability. A surface that read the setting directly would
    // skip two of them — which is how a dead button reached the screen.
    for (const file of ['src/components/layout/Sidebar.jsx', 'src/components/layout/AppLayout.jsx']) {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8');
      const at = src.search(/\w*[aA]gentEnabled\s*=/);
      if (at === -1) continue;
      expect(src.slice(at, at + 200), `${file} must gate the agent through useCapability with the build flag`)
        .toMatch(/useCapability\('blossom_agent',\s*'agent'\)/);
    }
  });

  it('every surface that cannot work without a backend is declared as such', async () => {
    const { SERVER_BACKED_KEYS } = await import('@/lib/capabilities');
    // Forgetting one of these puts a button back on screen whose only possible
    // answer is "requires a server".
    for (const key of ['blossom_agent', 'project_agent', 'reports_agent', 'email_tracking']) {
      expect(SERVER_BACKED_KEYS.has(key), `${key} must require a server`).toBe(true);
    }
    // And something that works perfectly well offline must NOT be gated.
    expect(SERVER_BACKED_KEYS.has('global_search')).toBe(false);
    expect(SERVER_BACKED_KEYS.has('notifications')).toBe(false);
  });
});

describe('sector modules are complete', () => {
  const SECTOR_IDS = [
    'employees', 'recruiting', 'training', 'inventory', 'purchasing',
    'assets', 'maintenance', 'compliance', 'risks', 'subscriptions',
  ];

  it('all ten are registered with an icon and a parent workspace', async () => {
    const { WORKSPACE_IDS } = await import('./modules');
    for (const id of SECTOR_IDS) {
      const m = MODULES[id];
      expect(m, `${id} missing from the manifest`).toBeTruthy();
      expect(NAV_ICONS[m.icon], `${id} has no icon`).toBeTruthy();
      expect(WORKSPACE_IDS, `${id} has no real parent`).toContain(m.parent);
      // A partial export ships only the modules it selected — check the page
      // only for the ones this bundle actually contains.
      if (SELECTED.includes(id)) {
        expect(pageExists(m.routes[0].page), `${id} page file missing`).toBe(true);
      }
    }
  });

  it('each has a schema whose list columns and filters resolve', async () => {
    const { CRM_SCHEMAS } = await import('./crm/schemas');
    for (const id of SECTOR_IDS) {
      // Schemas ship with the engine, so this holds in every bundle.
      const schema = CRM_SCHEMAS[id];
      expect(schema, `${id} has no schema`).toBeTruthy();
      expect(schema.fields.some((f) => f.list), `${id} shows no columns`).toBe(true);
      const keys = new Set(schema.fields.map((f) => f.key));
      for (const filter of schema.filters) {
        expect(keys.has(filter.key), `${id} filters on unknown field ${filter.key}`).toBe(true);
      }
      for (const field of schema.fields) {
        if (field.type === 'select') {
          expect(field.options?.length, `${id}.${field.key} has no options`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every owner field is a directory picker, in sector modules too', async () => {
    const { CRM_SCHEMAS } = await import('./crm/schemas');
    for (const id of SECTOR_IDS) {
      const owner = CRM_SCHEMAS[id].fields.find((f) => f.key === 'owner_email');
      if (owner) expect(owner.type, `${id}.owner_email`).toBe('person');
    }
  });

  it('board modules declare both the field and its stages', async () => {
    const { CRM_SCHEMAS } = await import('./crm/schemas');
    for (const schema of Object.values(CRM_SCHEMAS)) {
      if (!schema.boardField && !schema.boardStages) continue;
      expect(schema.boardField).toBeTruthy();
      expect(schema.boardStages?.length).toBeGreaterThan(0);
      expect(schema.fields.some((f) => f.key === schema.boardField)).toBe(true);
    }
  });
});

describe('named imports resolve', () => {
  // The build caught a page importing a symbol the module did not re-export,
  // while the tests stayed green. This closes that gap.
  it('every named import from a project module actually exists', async () => {
    const modules = {
      '@/lib/crm/schemas': await import('./crm/schemas'),
      '@/lib/crm/sectorSchemas': await import('./crm/sectorSchemas'),
      '@/lib/crm/useCrmRecords': await import('./crm/useCrmRecords'),
      '@/lib/customFields': await import('./customFields'),
      '@/lib/capabilities': await import('./capabilities'),
      '@/lib/modules': await import('./modules'),
      '@/lib/moduleRegistry': await import('./moduleRegistry'),
      '@/lib/features': await import('./features'),
      '@/lib/settingsSections': await import('./settingsSections'),
      '@/lib/appIdentity': await import('./appIdentity'),
      '@/lib/credentials': await import('./credentials'),
    };

    const walk = (dir, out = []) => {
      for (const e of fs.readdirSync(path.resolve(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel, out);
        else if (/\.jsx?$/.test(e.name) && !/\.test\./.test(e.name)) out.push(rel);
      }
      return out;
    };

    const problems = [];
    for (const file of walk('src')) {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8');
      for (const [, names, from] of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
        const mod = modules[from];
        if (!mod) continue;
        for (const raw of names.split(',')) {
          const name = raw.trim().split(/\s+as\s+/)[0].trim();
          if (name && !(name in mod)) problems.push(`${file}: '${name}' from ${from}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

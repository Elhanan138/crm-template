import { describe, it, expect } from 'vitest';
import { PACKAGES, packageById, modulesOf, capabilityValuesFor, coverageOf } from './onboardingPackages';
import { ACTIVE_MODULE_IDS } from './moduleRegistry';
import { MODULES } from './modules';
import { demoRecord, demoDataFor, isDemoRecord, DEMO_FLAG } from './demoData';
import { CRM_SCHEMAS } from './crm/schemas';
import { isDerived } from './crm/derived';

describe('starter packages', () => {
  it('describes a route, each stage containing the one before it', () => {
    expect(PACKAGES.map((p) => p.id)).toEqual(['sell', 'deliver', 'collect', 'control']);
    for (let i = 1; i < PACKAGES.length; i += 1) {
      for (const id of PACKAGES[i - 1].modules) {
        expect(PACKAGES[i].modules, `${PACKAGES[i].id} must contain ${id}`).toContain(id);
      }
    }
  });

  it('names only modules that exist in the manifest', () => {
    for (const pkg of PACKAGES) {
      for (const id of pkg.modules) expect(MODULES[id], `unknown module ${id}`).toBeTruthy();
    }
  });

  it('always keeps the modules the system cannot work without', () => {
    for (const pkg of PACKAGES) {
      const open = modulesOf(pkg);
      for (const id of ['dashboard', 'settings']) {
        if (ACTIVE_MODULE_IDS.includes(id)) expect(open).toContain(id);
      }
    }
  });

  it('never opens a module this build does not contain', () => {
    for (const pkg of PACKAGES) {
      for (const id of modulesOf(pkg)) expect(ACTIVE_MODULE_IDS).toContain(id);
    }
  });

  it('closes exactly what the package leaves out, and nothing else', () => {
    const values = capabilityValuesFor(packageById('sell'));
    const open = new Set(modulesOf(packageById('sell')));
    for (const id of ACTIVE_MODULE_IDS) {
      if (!MODULES[id]?.label) continue;
      expect(values[`module:${id}`]).toBe(open.has(id) ? 'all' : 'closed');
    }
  });

  it('closes a workspace only when every module inside it is closed', () => {
    const values = capabilityValuesFor(packageById('sell'));
    for (const id of ACTIVE_MODULE_IDS) {
      const workspace = MODULES[id]?.parent;
      if (!workspace) continue;
      const anyOpen = ACTIVE_MODULE_IDS.some(
        (m) => MODULES[m]?.parent === workspace && values[`module:${m}`] === 'all'
      );
      expect(values[`workspace:${workspace}`]).toBe(anyOpen ? 'all' : 'closed');
    }
  });

  it('reports honestly how much of a package this build can serve', () => {
    for (const pkg of PACKAGES) {
      const { have, wanted } = coverageOf(pkg);
      expect(have).toBeLessThanOrEqual(wanted);
      expect(wanted).toBe(pkg.modules.length);
    }
  });
});

describe('demo data', () => {
  const schema = CRM_SCHEMAS.leads;

  it('fills every stored field the schema declares, and no derived one', () => {
    const record = demoRecord(schema, 0);
    for (const field of schema.fields) {
      if (isDerived(field)) {
        expect(record[field.key], `${field.key} is derived`).toBeUndefined();
      } else if (field.type !== 'textarea' || field.required) {
        expect(record[field.key], `${field.key} was left empty`).toBeDefined();
      }
    }
  });

  it('only ever chooses a value the field actually allows', () => {
    for (const [id, s] of Object.entries(CRM_SCHEMAS)) {
      const record = demoRecord(s, 3);
      for (const field of s.fields) {
        if (field.type !== 'select' || isDerived(field)) continue;
        const allowed = (field.options || []).map((o) => String(o.value));
        expect(allowed, `${id}.${field.key}`).toContain(String(record[field.key]));
      }
    }
  });

  it('marks every record, so a purge can be exact', () => {
    const record = demoRecord(schema, 1);
    expect(record[DEMO_FLAG]).toBe(true);
    expect(isDemoRecord(record)).toBe(true);
    expect(isDemoRecord({ name: 'real' })).toBe(false);
  });

  it('is deterministic — the same index gives the same record', () => {
    expect(demoRecord(schema, 2)).toEqual(demoRecord(schema, 2));
    expect(demoRecord(schema, 2)).not.toEqual(demoRecord(schema, 3));
  });

  it('shares customers across modules, so the relations light up', () => {
    const data = demoDataFor(['leads', 'invoices'].filter((id) => CRM_SCHEMAS[id]));
    const companies = new Set((data.Lead || []).map((r) => r.company));
    const clients = new Set((data.Invoice || []).map((r) => r.client_name));
    const shared = [...companies].filter((c) => clients.has(c));
    expect(shared.length).toBeGreaterThan(0);
  });

  it('seeds nothing for a module that is not in this build', () => {
    expect(demoDataFor(['not_a_module'])).toEqual({});
  });
});

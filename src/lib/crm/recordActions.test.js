import { describe, it, expect } from 'vitest';
import { allRecordActions, recordActionsFor, actionPath, seedParams } from './recordActions';
import { MODULES, MODULE_IDS } from '@/lib/modules';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { EN } from '@/lib/i18n/dictionary';

// The fields a non-schema target accepts, mirroring the test in
// src/lib/reports/registry.test.js: there is no schema to read them from, so a
// typo in a seed key has to fail here rather than produce a parameter the
// target form silently ignores.
const NON_SCHEMA_FIELDS = {
  projects: ['lead_id', 'client_name', 'contract_value'],
  proposals: ['client_name', 'project_id', 'notes'],
};

const acceptedBy = (moduleId) =>
  CRM_SCHEMAS[moduleId]
    ? CRM_SCHEMAS[moduleId].fields.filter((f) => !f.derive).map((f) => f.key)
    : NON_SCHEMA_FIELDS[moduleId];

describe('every hand-off is declared completely', () => {
  it('names two real modules and a route it can reach', () => {
    for (const action of allRecordActions()) {
      expect(MODULE_IDS, action.key).toContain(action.from);
      expect(MODULE_IDS, action.key).toContain(action.requires);
      const target = action.path ? action.path({}) : MODULES[action.requires].navPath;
      expect(target, `${action.key} leads nowhere`).toBeTruthy();
    }
  });

  it('is translatable, label and hint alike', () => {
    for (const action of allRecordActions()) {
      expect(EN[action.label], `${action.key}: "${action.label}" has no English`).toBeTruthy();
      if (action.hint) expect(EN[action.hint], `${action.key}: hint has no English`).toBeTruthy();
    }
  });

  // The whole point of seeding through declared field names: a seed key the
  // target does not have is a value that vanishes without a word.
  it('only seeds fields the target actually accepts', () => {
    for (const action of allRecordActions()) {
      const accepted = acceptedBy(action.requires);
      expect(accepted, `no field list for ${action.requires}`).toBeTruthy();
      for (const key of Object.keys(action.seed?.({}) || {})) {
        expect(accepted, `${action.key} seeds ${action.requires}.${key}`).toContain(key);
      }
    }
  });

  it('never seeds a derived field — it would freeze a computed number', () => {
    for (const action of allRecordActions()) {
      const schema = CRM_SCHEMAS[action.requires];
      if (!schema) continue;
      const derived = schema.fields.filter((f) => f.derive).map((f) => f.key);
      for (const key of Object.keys(action.seed?.({}) || {})) {
        expect(derived, `${action.key} seeds derived ${key}`).not.toContain(key);
      }
    }
  });
});

describe('the revenue journey has no gap left in it', () => {
  const keysFrom = (moduleId, record) => recordActionsFor(moduleId, record).map((a) => a.key);

  it('offers a quote from a lead that names a customer', () => {
    expect(keysFrom('leads', { id: 'l1', company: 'אקמה' })).toContain('lead-to-proposal');
  });

  it('offers nothing from a lead with no customer to address it to', () => {
    expect(keysFrom('leads', { id: 'l1', company: '   ' })).not.toContain('lead-to-proposal');
    expect(keysFrom('leads', { id: 'l1' })).not.toContain('lead-to-proposal');
  });

  it('invoices an approved quote, and refuses a draft', () => {
    expect(keysFrom('proposals', { id: 'p1', status: 'approved' })).toContain('proposal-to-invoice');
    for (const status of ['draft', 'sent', 'rejected']) {
      expect(keysFrom('proposals', { id: 'p1', status }), status).not.toContain('proposal-to-invoice');
    }
  });

  it('turns an invoice into a subscription', () => {
    expect(keysFrom('invoices', { id: 'i1', client_name: 'אקמה' })).toContain('invoice-to-subscription');
  });

  it('offers nothing at all for a record that has not been saved yet', () => {
    for (const moduleId of ['leads', 'proposals', 'invoices']) {
      expect(recordActionsFor(moduleId, { company: 'אקמה', status: 'approved' }), moduleId).toEqual([]);
      expect(recordActionsFor(moduleId, null), moduleId).toEqual([]);
    }
  });
});

describe('where a hand-off leads', () => {
  const action = (key) => allRecordActions().find((a) => a.key === key);

  it('opens the target\'s own create form, not a second door into it', () => {
    const path = actionPath(action('lead-to-proposal'), { id: 'l1', company: 'אקמה' });
    expect(path).toContain(`${MODULES.proposals.navPath}?`);
    expect(new URLSearchParams(path.split('?')[1]).get('new')).toBe('1');
  });

  it('carries the values across, url-encoded', () => {
    const path = actionPath(action('proposal-to-invoice'), {
      id: 'p1', status: 'approved', client_name: 'אקמה בע"מ',
      amount_before_vat: 13500, vat_percent: 18, proposal_number: 'Q-2026-001',
    });
    const params = new URLSearchParams(path.split('?')[1]);
    expect(params.get('client_name')).toBe('אקמה בע"מ');
    expect(params.get('amount')).toBe('13500');
    expect(params.get('vat_percent')).toBe('18');
    expect(params.get('notes')).toContain('Q-2026-001');
  });

  it('drops a value the source record does not have, rather than sending empty', () => {
    const params = seedParams(action('proposal-to-invoice'), { id: 'p1', status: 'approved', client_name: 'אקמה' });
    expect(params.has('amount')).toBe(false);
    expect(params.has('vat_percent')).toBe(false);
    expect(params.get('client_name')).toBe('אקמה');
  });

  it('sends the project wizard to its own route, which is not a record form', () => {
    const path = actionPath(action('lead-to-project'), { id: 'l1', company: 'אקמה', value: 90000 });
    expect(path).toContain(`${MODULES.projects.navPath}/new?`);
    const params = new URLSearchParams(path.split('?')[1]);
    expect(params.get('lead_id')).toBe('l1');
    expect(params.get('contract_value')).toBe('90000');
    expect(params.has('new')).toBe(false);
  });
});

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, cleanup, within, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import CrmRecordSheet from './CrmRecordSheet';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { isDerived } from '@/lib/crm/derived';
import { CLIENT_ASSIGNEE } from '@/lib/clientAssignee';

// ─────────────────────────────────────────────────────────────────────────────
// Every field a schema declares has to reach the form.
//
// A field that exists in the schema and not in the form is invisible data: it
// saves as blank forever and nothing anywhere fails. Adding a field is one
// line in a schema, which is exactly why this needs checking by the schema
// rather than by hand per module.
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const modules = Object.entries(CRM_SCHEMAS)
  // A module with `customForm` renders its own editor instead of the generic
  // field list — the automation builder, which has its own test.
  .filter(([, schema]) => !schema.customForm);

const fillableFields = (schema) => schema.fields.filter((f) => !isDerived(f));

describe('the generic form offers every declared field', () => {
  it.each(modules)('%s', async (moduleId, schema) => {
    renderWithProviders(
      <CrmRecordSheet
        open
        onOpenChange={() => {}}
        schema={schema}
        record={null}
        relations={{}}
        customFields={[]}
        onSave={() => {}}
        moduleId={moduleId}
      />
    );

    const sheet = await screen.findByRole('dialog');
    const missing = [];
    for (const field of fillableFields(schema)) {
      if (within(sheet).queryAllByText(field.label).length === 0) missing.push(field.label);
    }
    expect(missing, `${moduleId}: declared but not rendered`).toEqual([]);
  });

  it('does not offer a derived field — it is an answer, not an input', async () => {
    // `balance` and `overdue_days` are computed; a box to type them in would
    // invite someone to contradict the arithmetic.
    renderWithProviders(
      <CrmRecordSheet
        open
        onOpenChange={() => {}}
        schema={CRM_SCHEMAS.invoices}
        record={null}
        relations={{}}
        customFields={[]}
        onSave={() => {}}
        moduleId="invoices"
      />
    );
    const sheet = await screen.findByRole('dialog');
    const derived = CRM_SCHEMAS.invoices.fields.filter(isDerived);
    expect(derived.length).toBeGreaterThan(0);
    for (const field of derived) {
      expect(
        within(sheet).queryAllByLabelText(field.label),
        `${field.key} is derived and must not be editable`,
      ).toHaveLength(0);
    }
  });

  it('pre-fills the defaults a schema declares', async () => {
    renderWithProviders(
      <CrmRecordSheet
        open
        onOpenChange={() => {}}
        schema={CRM_SCHEMAS.invoices}
        record={null}
        relations={{}}
        customFields={[]}
        onSave={() => {}}
        moduleId="invoices"
      />
    );
    const sheet = await screen.findByRole('dialog');
    // vat_percent defaults to 18; a blank VAT box is a quietly wrong invoice.
    await waitFor(() => expect(within(sheet).getByDisplayValue('18')).toBeTruthy());
  });
});

// Found by opening every page in a real browser: React warned about a missing
// key on every assignee dropdown, because the pseudo-assignee had no id while
// every people list in the system keys its rows by `m.id`.
describe('the client pseudo-assignee is shaped like the records beside it', () => {
  it('carries a stable id, so a people list can key by it', () => {
    expect(CLIENT_ASSIGNEE.id).toBeTruthy();
    expect(typeof CLIENT_ASSIGNEE.id).toBe('string');
  });

  it('is still marked as not a real team member', () => {
    expect(CLIENT_ASSIGNEE.is_client).toBe(true);
    expect(CLIENT_ASSIGNEE.email).toBe('');
  });

  it('cannot collide with a real record id', () => {
    // Real ids are generated; this one is deliberately not id-shaped.
    expect(CLIENT_ASSIGNEE.id).toMatch(/^__/);
  });
});

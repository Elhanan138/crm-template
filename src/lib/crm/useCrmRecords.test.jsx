import React, { useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { useCrmRecords } from './useCrmRecords';
import { CRM_SCHEMAS } from './schemas';

// The approval rule is enforced in the save every write passes through — the
// form, an inline cell and the bulk bar alike. A check that lives only in the
// form is a check the bulk bar walks straight past.

const KEY = 'oss_data_PurchaseOrder';
const stored = () => JSON.parse(localStorage.getItem(KEY));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(KEY, JSON.stringify([
    { id: 'big', number: 'PO-BIG', supplier: 'S', amount: 20000, status: 'draft', owner_email: 'admin@localhost' },
    { id: 'small', number: 'PO-SMALL', supplier: 'S', amount: 100, status: 'draft', owner_email: 'admin@localhost' },
  ]));
});
afterEach(cleanup);

function Probe({ run }) {
  const api = useCrmRecords(CRM_SCHEMAS.purchasing);
  useEffect(() => {
    if (!api.isLoading && api.records.length) run(api);
  }, [api.isLoading, api.records.length]);
  return null;
}

describe('approval is enforced where every write goes', () => {
  it('skips an unsigned order over the threshold in a bulk change, and moves the rest', async () => {
    renderWithProviders(<Probe run={(api) => api.bulkSave.mutate({ ids: ['big', 'small'], patch: { status: 'ordered' } })} />);
    await waitFor(() => expect(stored().find((r) => r.id === 'small').status).toBe('ordered'));
    expect(stored().find((r) => r.id === 'big').status).toBe('draft');
  });

  it('refuses a single save that would order it unsigned', async () => {
    let result;
    renderWithProviders(<Probe run={(api) => api.save.mutate(
      { id: 'big', status: 'ordered' },
      { onError: (e) => { result = e; } },
    )} />);
    await waitFor(() => expect(result).toBeTruthy());
    expect(result.name).toBe('ApprovalRequiredError');
    expect(stored().find((r) => r.id === 'big').status).toBe('draft');
  });

  it('lets it through once it is signed', async () => {
    renderWithProviders(<Probe run={(api) => api.save.mutate({ id: 'big', status: 'ordered', approved_by: 'דנה' })} />);
    await waitFor(() => expect(stored().find((r) => r.id === 'big').status).toBe('ordered'));
  });
});

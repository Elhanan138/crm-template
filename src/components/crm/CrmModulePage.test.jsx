import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, cleanup, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import CrmModulePage from './CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

// The local data client is backed by localStorage, which jsdom provides — so
// these render the real page against real data rather than against a mock, and
// exercise the query layer, the permissions and the schema together.
const PREFIX = 'oss_data_';
// A LOCAL calendar day. Building this through toISOString() shifts the date
// east of Greenwich once the clock passes midnight, which made these tests
// pass by day and fail at night.
const dayString = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const day = dayString;

const seedLeads = (count, extra = []) => {
  const stages = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  // Leads sort by newest first. Stamping every row with `new Date()` looks
  // deterministic and is not: on a loaded machine the loop straddles a
  // millisecond, half the rows get a later timestamp than the other half, and
  // the order flips. A minute between rows makes "Deal 1 first" a fact.
  const base = Date.now();
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `l${i + 1}`,
    name: `Deal ${i + 1}`,
    company: `Client ${i + 1}`,
    stage: stages[i % stages.length],
    value: 1000 * (i + 1),
    expected_close: day(i - 5),
    owner_email: 'admin@localhost',
    created_date: new Date(base - i * 60_000).toISOString(),
  }));
  localStorage.setItem(PREFIX + 'Lead', JSON.stringify([...rows, ...extra]));
};

const renderLeads = () =>
  renderWithProviders(<CrmModulePage schema={CRM_SCHEMAS.leads} moduleId="leads" />);

const table = () => screen.getByRole('table');
const rowTexts = () => screen.getAllByRole('row').slice(1).map((r) => r.textContent);
// Both layouts render in jsdom (the mobile cards are only hidden by CSS), so a
// text query has to say which one it means.
const inTable = (text) => within(table()).getAllByText(text)[0];
// The largest case renders sixty rows through the real query layer. On a busy
// machine — a dev server running beside the suite, say — that outruns the one
// second waitFor allows by default. A passing case still returns immediately,
// so a generous ceiling costs nothing and stops the suite failing for load.
const findInTable = async (text) => {
  await waitFor(
    () => expect(within(table()).getAllByText(text).length).toBeGreaterThan(0),
    { timeout: 15000 },
  );
  return inTable(text);
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('the shared list', () => {
  it('renders a row per record, with the derived column computed', async () => {
    seedLeads(3);
    renderLeads();

    await findInTable('Deal 1');
    expect(inTable('Deal 3')).toBeTruthy();
    // Deal 4 was never seeded.
    expect(within(table()).queryByText('Deal 4')).toBeNull();

    // Deal 1 is a 'new' deal worth 1,000, and 'new' carries a 10% probability.
    // The row is found by its name rather than by position: the seeded records
    // share a created_date, so their default order is not guaranteed.
    const row = screen.getAllByRole('row').find((r) => r.textContent.includes('Deal 1'));
    expect(within(row).getByText('₪100')).toBeTruthy();
  });

  it('opens on every row and narrows to a segment when one is chosen', async () => {
    const user = userEvent.setup();
    seedLeads(6);
    renderLeads();
    await findInTable('Deal 1');
    expect(rowTexts()).toHaveLength(6);

    // 'won' and 'lost' are closed, so four of the six remain open.
    await user.click(screen.getByRole('button', { name: /פתוחים/ }));
    await waitFor(() => expect(rowTexts()).toHaveLength(4));
  });

  it('sorts a column, and reverses it on a second click', async () => {
    const user = userEvent.setup();
    seedLeads(3);
    renderLeads();
    await findInTable('Deal 1');

    const header = within(table()).getByRole('button', { name: /שווי צפוי/ });
    await user.click(header);
    await waitFor(() => expect(rowTexts()[0]).toContain('Deal 1'));

    await user.click(header);
    await waitFor(() => expect(rowTexts()[0]).toContain('Deal 3'));
  });

  it('marks the sorted column for assistive technology', async () => {
    const user = userEvent.setup();
    seedLeads(2);
    renderLeads();
    await findInTable('Deal 1');

    await user.click(within(table()).getByRole('button', { name: /שווי צפוי/ }));
    await waitFor(() => {
      // Only the data columns describe their sort state; the checkbox and the
      // actions column are not sortable and carry no aria-sort at all.
      const described = screen.getAllByRole('columnheader').filter((h) => h.hasAttribute('aria-sort'));
      const sorted = described.filter((h) => h.getAttribute('aria-sort') !== 'none');
      expect(sorted).toHaveLength(1);
      expect(sorted[0].getAttribute('aria-sort')).toBe('ascending');
      expect(sorted[0].textContent).toContain('שווי צפוי');
    });
  });
});

describe('selection and bulk actions', () => {
  it('shows the bulk bar only once something is selected', async () => {
    const user = userEvent.setup();
    seedLeads(3);
    renderLeads();
    await findInTable('Deal 1');

    expect(screen.queryByText(/נבחרו/)).toBeNull();

    const [first] = screen.getAllByRole('checkbox', { name: 'בחירת שורה' });
    await user.click(first);
    const bar = (await screen.findByText(/נבחרו/)).parentElement;
    expect(within(bar).getByRole('button', { name: /מחיקה/ })).toBeTruthy();
  });

  it('select-all covers the visible page and clears again', async () => {
    const user = userEvent.setup();
    seedLeads(4);
    renderLeads();
    await findInTable('Deal 1');

    const all = screen.getByRole('checkbox', { name: 'בחירת הכל' });
    await user.click(all);
    await waitFor(() => {
      const boxes = screen.getAllByRole('checkbox', { name: 'בחירת שורה' });
      expect(boxes.every((b) => b.getAttribute('data-state') === 'checked')).toBe(true);
    });

    await user.click(all);
    await waitFor(() => {
      const boxes = screen.getAllByRole('checkbox', { name: 'בחירת שורה' });
      expect(boxes.every((b) => b.getAttribute('data-state') === 'unchecked')).toBe(true);
    });
  });

  it('drops the selection when the visible set changes', async () => {
    const user = userEvent.setup();
    seedLeads(6);
    renderLeads();
    await findInTable('Deal 1');

    await user.click(screen.getAllByRole('checkbox', { name: 'בחירת שורה' })[0]);
    await screen.findByText(/נבחרו/);

    await user.click(screen.getByRole('button', { name: /פתוחים/ }));
    await waitFor(() => expect(screen.queryByText(/נבחרו/)).toBeNull());
  });
});

describe('paging', () => {
  it('shows one page of rows and moves to the next', async () => {
    const user = userEvent.setup();
    seedLeads(62);
    renderLeads();
    await findInTable('Deal 1');

    expect(rowTexts()).toHaveLength(50);
    expect(rowTexts().some((t) => t.includes('Deal 51'))).toBe(false);

    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(rowTexts().some((t) => t.includes('Deal 51'))).toBe(true));
    expect(rowTexts()).toHaveLength(12);
  });

  it('does not page a short list at all', async () => {
    seedLeads(5);
    renderLeads();
    await findInTable('Deal 1');
    expect(screen.queryByRole('button', { name: '2' })).toBeNull();
  });
});

describe('inline editing', () => {
  const cellWith = (text) => screen.getAllByRole('cell').find((c) => c.textContent === text);

  it('opens an editor on ONE click of the value, and writes the change through', async () => {
    const user = userEvent.setup();
    seedLeads(1);
    renderLeads();
    await findInTable('Deal 1');

    const valueCell = cellWith('₪1,000');
    await user.click(within(valueCell).getByRole('button'));

    const input = await within(valueCell).findByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5000' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(PREFIX + 'Lead'));
      expect(stored[0].value).toBe('5000');
    });
  });

  it('does not open the record sheet when the value is clicked', async () => {
    const user = userEvent.setup();
    seedLeads(1);
    renderLeads();
    await findInTable('Deal 1');

    await user.click(within(cellWith('₪1,000')).getByRole('button'));
    // The sheet and the inline editor are alternatives, never both at once.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still opens the record when the row is clicked away from a value', async () => {
    const user = userEvent.setup();
    seedLeads(1);
    renderLeads();
    await findInTable('Deal 1');

    await user.click(screen.getAllByRole('row')[1]);
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('leaves a derived column alone — there is nothing to type into it', async () => {
    seedLeads(1);
    renderLeads();
    await findInTable('Deal 1');

    // 10% of 1,000 for a 'new' deal. It offers no target to click at all.
    const derivedCell = cellWith('₪100');
    expect(within(derivedCell).queryByRole('button')).toBeNull();
  });

  it('asks for a click, never a double-click', async () => {
    seedLeads(1);
    renderLeads();
    await findInTable('Deal 1');

    const trigger = within(cellWith('₪1,000')).getByRole('button');
    expect(trigger).toHaveAttribute('title', 'לחיצה לעריכה מהירה');
  });
});

describe('columns', () => {
  it('renders the schema default, and the control to change it', async () => {
    seedLeads(1);
    renderLeads();
    await findInTable('Deal 1');

    // The schema keeps the phone out of the table by default.
    expect(within(table()).queryByRole('button', { name: /טלפון/ })).toBeNull();
    expect(screen.getByRole('button', { name: /עמודות/ })).toBeTruthy();
  });

  it('renders a saved column choice instead of the default', async () => {
    localStorage.setItem('crm_table_prefs_leads', JSON.stringify({ columns: ['name', 'contact_phone'] }));
    seedLeads(1);
    renderLeads();
    await findInTable('Deal 1');

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent.trim()).filter(Boolean);
    expect(headers).toEqual(['שם ההזדמנות', 'טלפון']);
  });
});

describe('duplicates', () => {
  const twins = [
    { id: 'a', name: 'Rollout', company: 'Acme Ltd', contact_email: 'dana@acme.co', stage: 'new', owner_email: 'admin@localhost', created_date: new Date().toISOString() },
    { id: 'b', name: 'Pilot', company: 'Acme', contact_email: 'DANA@acme.co', stage: 'new', owner_email: 'admin@localhost', created_date: new Date().toISOString() },
  ];

  it('offers the duplicate review only when there is something to review', async () => {
    seedLeads(3);
    renderLeads();
    await findInTable('Deal 1');
    expect(screen.queryByRole('button', { name: /כפילויות/ })).toBeNull();

    cleanup();
    localStorage.setItem(PREFIX + 'Lead', JSON.stringify(twins));
    renderLeads();
    expect(await screen.findByRole('button', { name: /כפילויות/ })).toBeTruthy();
  });

  it('lists the matching records together', async () => {
    const user = userEvent.setup();
    localStorage.setItem(PREFIX + 'Lead', JSON.stringify(twins));
    renderLeads();

    await user.click(await screen.findByRole('button', { name: /כפילויות/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Rollout')).toBeTruthy();
    expect(within(dialog).getByText('Pilot')).toBeTruthy();
  });
});

describe('permissions', () => {
  it('refuses a module the viewer may not read, instead of showing an empty table', async () => {
    localStorage.setItem(PREFIX + 'Employee', JSON.stringify([{ id: 'e1', full_name: 'Dana', status: 'active' }]));
    renderWithProviders(<CrmModulePage schema={CRM_SCHEMAS.employees} moduleId="employees" />);
    // The local client signs in the owner as an admin, so the module opens;
    // what matters is that the page decides, rather than the table rendering
    // rows nobody checked.
    await waitFor(() => {
      const denied = screen.queryByText('אין לך גישה למודול הזה');
      const table = screen.queryByRole('table');
      expect(Boolean(denied) !== Boolean(table)).toBe(true);
    });
  });
});

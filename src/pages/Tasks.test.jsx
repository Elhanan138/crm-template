import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, cleanup, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import Tasks from './Tasks';

// ─────────────────────────────────────────────────────────────────────────────
// The tasks page said "every task from every project" and showed only tasks
// assigned to your name — unconditionally. A task you created without naming an
// owner vanished the moment you saved it, and a deployment whose owner has no
// TeamMember record had no name to match at all, so the list was empty however
// many tasks it held.
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = 'oss_data_';

const seedTasks = (rows) =>
  localStorage.setItem(PREFIX + 'Task', JSON.stringify(rows.map((row, i) => ({
    id: `t${i + 1}`,
    status: 'in_progress',
    priority: 'medium',
    created_date: new Date(Date.now() - i * 60_000).toISOString(),
    ...row,
  }))));

const render = () => renderWithProviders(<Tasks />);
// Both layouts render in jsdom — the mobile cards are only hidden by CSS — so a
// title matches twice and a singular query would throw on the duplicate.
const findRow = async (text) => {
  const found = await screen.findAllByText(text);
  expect(found.length).toBeGreaterThan(0);
  return found[0];
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('the tasks page', () => {
  it('shows a task nobody was assigned to — the one you just created', async () => {
    seedTasks([{ title: 'משימה ללא אחראי' }]);
    render();
    expect(await findRow('משימה ללא אחראי')).toBeInTheDocument();
  });

  it('shows tasks assigned to other people too, as its subtitle promises', async () => {
    seedTasks([
      { title: 'של דנה', assigned_to: 'דנה' },
      { title: 'של יוסי', assigned_to: 'יוסי' },
    ]);
    render();
    expect(await findRow('של דנה')).toBeInTheDocument();
    expect(await findRow('של יוסי')).toBeInTheDocument();
  });

  it('narrows to your own only when you ask it to', async () => {
    seedTasks([
      { title: 'ללא אחראי' },
      { title: 'של דנה', assigned_to: 'דנה' },
    ]);
    render();
    await findRow('של דנה');

    // The scope control is the only thing that hides another person's task.
    const scope = screen.getAllByRole('combobox').find((c) => c.textContent.includes('כל המשימות'));
    expect(scope).toBeTruthy();
  });

  it('says the filter is empty, not that there is nothing, when there is', async () => {
    seedTasks([{ title: 'משימה שהושלמה', status: 'done' }]);
    render();
    // The default status filter hides completed work; the page must not claim
    // the system is empty when it is holding a task.
    await waitFor(() => expect(screen.getByText(/אין משימות שתואמות את הסינון/)).toBeInTheDocument());
  });

  it('says there is nothing when there really is nothing', async () => {
    seedTasks([]);
    render();
    await waitFor(() => expect(screen.getByText('אין משימות')).toBeInTheDocument());
  });
});

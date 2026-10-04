import React, { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Palette, ShieldCheck, Users } from 'lucide-react';
import SectionStepperNav from './SectionStepperNav';

const SECTIONS = [
  {
    key: 'admin',
    label: 'אדמין',
    icon: ShieldCheck,
    children: [
      { key: 'branding', label: 'מיתוג ולוגו', hint: 'לוגו וצבע מותג', icon: Palette },
      { key: 'capabilities', label: 'יכולות המערכת', hint: 'הדלקה וכיבוי', icon: ShieldCheck },
    ],
  },
  { key: 'users', label: 'משתמשים והרשאות', hint: 'מי נכנס למערכת', icon: Users },
];

function Harness() {
  const [active, setActive] = useState('users');
  const [child, setChild] = useState('branding');
  return (
    <div>
      <SectionStepperNav
        title="הגדרות"
        searchable
        sections={SECTIONS}
        activeKey={active}
        activeChildKey={child}
        onSelect={setActive}
        onSelectChild={setChild}
      />
      <p data-testid="state">{active}/{child}</p>
    </div>
  );
}

const searchBox = () => screen.getByPlaceholderText('חיפוש...');
const state = () => screen.getByTestId('state').textContent;

afterEach(cleanup);

describe('searching the settings tree', () => {
  it('finds a sub-section by name, even under a tab that is not open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // "מיתוג" lives two levels down, under a tab that is not the active one.
    await user.type(searchBox(), 'מיתוג');
    expect(screen.getAllByText('מיתוג ולוגו').length).toBeGreaterThan(0);
    expect(screen.queryByText('יכולות המערכת')).toBeNull();
  });

  it('finds a section by what it does, not only by its name', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(searchBox(), 'צבע מותג');
    expect(screen.getAllByText('מיתוג ולוגו').length).toBeGreaterThan(0);
  });

  it('opens the branch and the leaf together when a result is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(searchBox(), 'יכולות');
    await user.click(screen.getByRole('button', { name: /יכולות המערכת/ }));
    expect(state()).toBe('admin/capabilities');
  });

  it('clears the query once a result is taken, so the tree is readable again', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(searchBox(), 'יכולות');
    await user.click(screen.getByRole('button', { name: /יכולות המערכת/ }));
    expect(searchBox().value).toBe('');
  });

  it('says nothing matched instead of showing a blank column', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(searchBox(), 'זבנג');
    expect(screen.getByText(/אין הגדרה שתואמת/)).toBeInTheDocument();
  });

  it('shows the whole tree again when the query is emptied', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(searchBox(), 'מיתוג');
    await user.clear(searchBox());
    expect(screen.getAllByText('אדמין').length).toBeGreaterThan(0);
    expect(screen.getAllByText('משתמשים והרשאות').length).toBeGreaterThan(0);
  });
});

describe('what the nav explains without being asked', () => {
  it('carries each section hint as its tooltip', () => {
    render(<Harness />);
    const users = screen.getAllByRole('button', { name: /משתמשים והרשאות/ })[0];
    expect(users).toHaveAttribute('title', 'מי נכנס למערכת');
  });
});

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import BoardView from './BoardView';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

const candidates = [
  { id: 'c1', full_name: 'דנה לוי', position: 'מפתחת', stage: 'interview' },
  { id: 'c2', full_name: 'יוסי כהן', position: 'QA', stage: 'applied' },
];

afterEach(cleanup);

describe('BoardView', () => {
  it('renders every stage and places records in the right column', () => {
    render(
      <BoardView
        schema={CRM_SCHEMAS.recruiting}
        records={candidates}
        openRecord={() => {}}
        subtitleOf={(c) => c.position}
      />
    );
    for (const stage of CRM_SCHEMAS.recruiting.boardStages) {
      expect(screen.getByText(stage.label)).toBeTruthy();
    }
    expect(screen.getByText('דנה לוי')).toBeTruthy();
    expect(screen.getByText('מפתחת')).toBeTruthy();
  });

  it('renders without an amount accessor — the crash that took down /recruiting', () => {
    // `valueOf` used to be the prop name here. Destructuring inherited
    // Object.prototype.valueOf instead of undefined, so the "optional" prop was
    // a function that threw the moment it was called.
    expect(() =>
      render(<BoardView schema={CRM_SCHEMAS.recruiting} records={candidates} openRecord={() => {}} />)
    ).not.toThrow();
  });

  it('totals a column when an amount accessor is given', () => {
    render(
      <BoardView
        schema={CRM_SCHEMAS.recruiting}
        records={[{ id: 'x', full_name: 'א', stage: 'offer', expected_salary: 25000 }]}
        openRecord={() => {}}
        amountOf={(c) => c.expected_salary}
        formatValue={(n) => `₪${n}`}
      />
    );
    expect(screen.getByText('₪25000')).toBeTruthy();
  });

  it('renders nothing rather than crashing on a schema with no stages', () => {
    const { container } = render(<BoardView schema={{}} records={[]} openRecord={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('no component prop shadows an Object.prototype member', () => {
  const POISONED = [
    'valueOf', 'toString', 'constructor', 'hasOwnProperty',
    'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
  ];

  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(path.resolve(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.jsx$/.test(e.name) && !/\.test\./.test(e.name)) out.push(rel);
    }
    return out;
  };

  it('destructured props never use an inherited name', () => {
    const offenders = [];
    for (const file of walk('src')) {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8');
      for (const [, params] of src.matchAll(/function\s+\w+\s*\(\s*\{([^}]*)\}/g)) {
        for (const raw of params.split(',')) {
          const name = raw.trim().split(/[:=]/)[0].trim();
          if (POISONED.includes(name)) offenders.push(`${file}: ${name}`);
        }
      }
    }
    expect(offenders, 'these props fall back to a built-in instead of undefined').toEqual([]);
  });
});

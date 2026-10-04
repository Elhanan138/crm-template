import { describe, it, expect } from 'vitest';
import { buildOrgTree, headcountUnder } from './orgChart';

const e = (id, full_name, manager, extra = {}) => ({ id, full_name, manager, status: 'active', ...extra });
const names = (nodes) => nodes.map((n) => n.employee.full_name);
const flatten = (nodes) => nodes.flatMap((n) => [n.employee.id, ...flatten(n.reports)]);

describe('the reporting tree', () => {
  const staff = [
    e('1', 'רונית', ''), e('2', 'אבי', 'רונית'), e('3', 'גל', 'רונית'), e('4', 'דנה', 'אבי'),
  ];

  it('nests people under the manager they name', () => {
    const [root] = buildOrgTree(staff);
    expect(root.employee.full_name).toBe('רונית');
    expect(names(root.reports)).toEqual(['אבי', 'גל']);
    expect(names(root.reports[0].reports)).toEqual(['דנה']);
    expect(headcountUnder(root)).toBe(3);
  });

  it('matches the manager name loosely — spacing and case are not a different person', () => {
    const [root] = buildOrgTree([e('1', 'Dana Cohen', ''), e('2', 'Avi', '  dana cohen ')]);
    expect(names(root.reports)).toEqual(['Avi']);
  });

  it('keeps someone whose manager matches nobody, as a root — never drops them', () => {
    const tree = buildOrgTree([...staff, e('5', 'יוסי', 'מנהל שעזב')]);
    expect(names(tree)).toContain('יוסי');
  });

  it('places every current employee exactly once', () => {
    const ids = flatten(buildOrgTree(staff));
    expect(ids.sort()).toEqual(['1', '2', '3', '4']);
  });

  it('leaves out people who have left', () => {
    const ids = flatten(buildOrgTree([...staff, e('9', 'עזב', 'רונית', { status: 'ended' })]));
    expect(ids).not.toContain('9');
  });

  it('survives a loop instead of recursing forever, and still shows everyone in it', () => {
    const loop = [e('1', 'א', 'ב'), e('2', 'ב', 'ג'), e('3', 'ג', 'א')];
    const ids = flatten(buildOrgTree(loop));
    expect(ids.sort()).toEqual(['1', '2', '3']);
  });

  it('treats someone named as their own manager as a root', () => {
    expect(names(buildOrgTree([e('1', 'א', 'א')]))).toEqual(['א']);
  });

  it('answers for nothing at all', () => {
    expect(buildOrgTree()).toEqual([]);
    expect(buildOrgTree(null)).toEqual([]);
  });
});

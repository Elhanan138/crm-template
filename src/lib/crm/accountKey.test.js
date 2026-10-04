import { describe, it, expect } from 'vitest';
import { accountKey, sameAccount, groupByAccount } from './accountKey';

describe('accountKey', () => {
  it('treats the legal-form suffix as noise', () => {
    expect(accountKey('בלוסום בע"מ')).toBe(accountKey('בלוסום בעמ'));
    expect(accountKey('בלוסום בע״מ')).toBe(accountKey('בלוסום'));
    expect(accountKey('Acme Ltd.')).toBe(accountKey('ACME'));
  });

  it('ignores casing, padding and punctuation', () => {
    expect(accountKey('  Acme,  Inc. ')).toBe('acme');
    expect(accountKey('בלוסום - טכנולוגיות')).toBe('בלוסום טכנולוגיות');
  });

  it('drops a descriptive prefix but keeps it inside a name', () => {
    expect(accountKey('חברת בלוסום')).toBe('בלוסום');
    expect(accountKey('בלוסום קבוצת רכש')).toBe('בלוסום קבוצת רכש');
  });

  it('never reduces a name to nothing', () => {
    // A company literally called "בע\"מ" still has to compare as itself rather
    // than collapse to '' and match every other empty value in the system.
    expect(accountKey('בע"מ')).toBe('בעמ');
    expect(accountKey('Ltd')).toBe('ltd');
  });

  it('returns empty for absent values, and empty never matches', () => {
    expect(accountKey('')).toBe('');
    expect(accountKey(null)).toBe('');
    expect(accountKey(undefined)).toBe('');
    expect(sameAccount('', '')).toBe(false);
    expect(sameAccount(null, undefined)).toBe(false);
  });

  it('keeps different customers apart', () => {
    expect(sameAccount('בלוסום', 'בלוסום טכנולוגיות')).toBe(false);
    expect(sameAccount('Acme', 'Acme Systems')).toBe(false);
  });

  it('groups records under one key across spelling variants', () => {
    const grouped = groupByAccount(
      [
        { id: 1, company: 'בלוסום בע"מ' },
        { id: 2, company: 'בלוסום' },
        { id: 3, company: '' },
        { id: 4, company: 'Acme Ltd' },
      ],
      'company'
    );
    expect(grouped.get('בלוסום').map((r) => r.id)).toEqual([1, 2]);
    expect(grouped.get('acme').map((r) => r.id)).toEqual([4]);
    expect(grouped.size).toBe(2);
  });
});

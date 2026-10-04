import { describe, it, expect } from 'vitest';
import { competencyMatrix, cellState, CELL_STATES } from './competency';
import { TONES, normalizeTone } from '../tones';
import { EN } from '../i18n/dictionary';

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const en = (participant, course_name, status, extra = {}) => ({ participant, course_name, status, ...extra });

describe('people across courses', () => {
  const rows = [
    en('דנה', 'בטיחות', 'completed', { mandatory: true }),
    en('אבי', 'בטיחות', 'assigned', { mandatory: true, due_date: day(10) }),
    en('דנה', 'אקסל', 'in_progress'),
  ];
  const m = competencyMatrix(rows);

  it('lists each person and each course once, mandatory courses first', () => {
    expect(m.people).toEqual(['אבי', 'דנה']);
    expect(m.courses[0]).toBe('בטיחות');
    expect(m.courses).toHaveLength(2);
  });

  it('answers per cell, and nothing where nothing was assigned', () => {
    expect(cellState(m.cell('דנה', 'בטיחות'))).toBe('completed');
    expect(m.cell('אבי', 'אקסל')).toBeNull();
    expect(cellState(null)).toBe('none');
  });

  it('measures coverage among the people actually assigned a course', () => {
    expect(m.coverage('בטיחות')).toBe(50);
    expect(m.coverage('אקסל')).toBe(0);
  });

  it('measures readiness on mandatory courses only', () => {
    expect(m.readiness('דנה')).toBe(100);
    expect(m.readiness('אבי')).toBe(0);
  });
});

describe('a cell tells the truth about lateness', () => {
  it('reads overdue from the date, not only from a status someone forgot to change', () => {
    expect(cellState(en('a', 'b', 'assigned', { due_date: day(-3) }))).toBe('overdue');
    expect(cellState(en('a', 'b', 'in_progress', { due_date: day(-1) }))).toBe('overdue');
  });

  it('never calls a completed course late', () => {
    expect(cellState(en('a', 'b', 'completed', { due_date: day(-30) }))).toBe('completed');
  });

  it('keeps a completion on file when a retake is in progress', () => {
    const m = competencyMatrix([en('דנה', 'בטיחות', 'completed'), en('דנה', 'בטיחות', 'in_progress')]);
    expect(cellState(m.cell('דנה', 'בטיחות'))).toBe('completed');
  });

  it('carries a known tone and an English label for every state', () => {
    for (const s of CELL_STATES) {
      expect(TONES).toContain(normalizeTone(s.tone));
      expect(EN[s.label], s.label).toBeTruthy();
    }
  });
});

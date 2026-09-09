import { describe, it, expect } from 'vitest';
import {
  TONES, normalizeTone, dotFor, surfaceFor, textFor, toneOfOption, toneForNumber,
} from './tones';
import { CRM_SCHEMAS } from './crm/schemas';
import { relativeDay } from '@/components/shared/fieldControls';

const dayString = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('one tone map for the whole system', () => {
  it('answers for every tone it names', () => {
    for (const tone of TONES) {
      expect(dotFor(tone), tone).toBeTruthy();
      expect(surfaceFor(tone), tone).toBeTruthy();
      expect(textFor(tone), tone).toBeTruthy();
    }
  });

  it('treats the schemas\' "muted" and the badge\'s "neutral" as one thing', () => {
    expect(normalizeTone('muted')).toBe('neutral');
    expect(normalizeTone(undefined)).toBe('neutral');
    expect(dotFor('muted')).toBe(dotFor('neutral'));
  });

  it('falls back to quiet rather than to nothing', () => {
    expect(dotFor('lavender')).toBe(dotFor('neutral'));
    expect(surfaceFor(null)).toBe(surfaceFor('neutral'));
  });

  it('uses semantic tokens only — never a palette colour', () => {
    const classes = TONES.flatMap((t) => [dotFor(t), surfaceFor(t), textFor(t)]).join(' ');
    expect(classes).not.toMatch(/\b(?:red|green|blue|yellow|orange|purple|gray|grey|slate|zinc)-\d/);
  });

  it('reads the tone the schema already put on an option', () => {
    const stage = CRM_SCHEMAS.leads.fields.find((f) => f.key === 'stage');
    expect(toneOfOption(stage.options, 'won')).toBe('success');
    expect(toneOfOption(stage.options, 'lost')).toBe('destructive');
    // 'new' is declared muted, which is the same as neutral.
    expect(toneOfOption(stage.options, 'new')).toBe('neutral');
    expect(toneOfOption(stage.options, 'not-a-stage')).toBe('neutral');
  });
});

describe('a number that carries a meaning', () => {
  it('stays quiet at zero and for anything unreadable', () => {
    expect(toneForNumber(0, { badAbove: 0 })).toBe('neutral');
    expect(toneForNumber('', { badAbove: 0 })).toBe('neutral');
    expect(toneForNumber('abc', { badAbove: 0 })).toBe('neutral');
    expect(toneForNumber(5)).toBe('neutral');
  });

  it('marks a balance still owed, and a margin gone negative', () => {
    expect(toneForNumber(1180, { badAbove: 0 })).toBe('destructive');
    expect(toneForNumber(-4, { badBelow: 0 })).toBe('destructive');
  });

  it('warns before it alarms', () => {
    const bounds = { warnAbove: 8, badAbove: 14 };
    expect(toneForNumber(6, bounds)).toBe('neutral');
    expect(toneForNumber(9, bounds)).toBe('warning');
    expect(toneForNumber(20, bounds)).toBe('destructive');
  });
});

describe('a date that says how far away it is', () => {
  it('names today and tomorrow rather than counting them', () => {
    expect(relativeDay(dayString(0)).key).toBe('היום');
    expect(relativeDay(dayString(1)).key).toBe('מחר');
    expect(relativeDay(dayString(-1)).key).toBe('אתמול');
  });

  it('treats a date already passed as something to act on', () => {
    expect(relativeDay(dayString(-5)).tone).toBe('destructive');
    expect(relativeDay(dayString(-5)).key).toBe('לפני {n} ימים');
    expect(relativeDay(dayString(-5)).days).toBe(5);
  });

  it('warns about the coming week and stays quiet beyond it', () => {
    expect(relativeDay(dayString(3)).tone).toBe('warning');
    expect(relativeDay(dayString(30)).tone).toBe('neutral');
  });

  it('keeps the count out of the phrase, so each language can order it', () => {
    // "5 days ago" and "לפני 5 ימים" put the number in different places.
    for (const offset of [-5, 3, 30]) expect(relativeDay(dayString(offset)).key).toContain('{n}');
  });

  it('says nothing at all for a date that is not one', () => {
    expect(relativeDay('')).toBeNull();
    expect(relativeDay(null)).toBeNull();
    expect(relativeDay('not a date')).toBeNull();
  });
});

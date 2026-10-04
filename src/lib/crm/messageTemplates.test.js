import { describe, it, expect } from 'vitest';
import { RECRUITING_TEMPLATES, fillTemplate, mailtoFor } from './messageTemplates';
import { recordActionsFor, inboundActionsFor } from './recordActions';
import { CANDIDATE_STAGES } from './sectorSchemas';
import { EN } from '../i18n/dictionary';

const candidate = { id: 'c1', full_name: 'נועה לוי', position: 'מפתחת', email: 'noa@example.com', stage: 'interview' };

describe('a message is filled from the record it is sent to', () => {
  it('replaces every placeholder', () => {
    expect(fillTemplate('שלום {{full_name}} — {{ position }}', candidate)).toBe('שלום נועה לוי — מפתחת');
  });

  it('leaves a missing value empty, never "undefined"', () => {
    expect(fillTemplate('{{full_name}}|{{nope}}', {})).toBe('|');
  });

  it('opens a mail client addressed to the candidate, with spaces a mail client reads', () => {
    const tpl = RECRUITING_TEMPLATES.find((t) => t.key === 'interview');
    const href = mailtoFor(tpl, candidate);
    expect(href.startsWith('mailto:noa%40example.com?')).toBe(true);
    expect(href).not.toContain('+');
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toContain('מפתחת');
    expect(params.get('body')).toContain('נועה לוי');
  });
});

describe('a template belongs to a stage that exists', () => {
  it.each(RECRUITING_TEMPLATES.map((t) => [t.key, t]))('%s', (_key, tpl) => {
    expect(CANDIDATE_STAGES.map((s) => s.value)).toContain(tpl.stage);
    expect(EN[tpl.label], `"${tpl.label}" has no English`).toBeTruthy();
  });
});

describe('the message offered is the one for the stage the candidate is in', () => {
  const keys = (record) => recordActionsFor('recruiting', record).map((a) => a.key);

  it('offers the interview invitation at the interview stage, and only that', () => {
    expect(keys(candidate)).toEqual(['message-interview']);
  });

  it('offers nothing to a candidate with no email to send to', () => {
    expect(keys({ ...candidate, email: '' })).toEqual([]);
  });

  it('marks the action as leaving the app, so it is a plain link and not a route', () => {
    const [action] = recordActionsFor('recruiting', candidate);
    expect(action.external).toBe(true);
    expect(action.to()).toMatch(/^mailto:/);
  });
});

describe('a view or a mail link is not "where records come from"', () => {
  it('keeps the empty state from saying a module feeds itself', () => {
    expect(inboundActionsFor('recruiting')).toEqual([]);
    expect(inboundActionsFor('assets')).toEqual([]);
  });

  it('links the hand-over form to the asset it is for', () => {
    const [action] = recordActionsFor('assets', { id: 'a 1' });
    expect(action.key).toBe('asset-handover');
    expect(action.to()).toBe('/assets?handover=a%201');
  });
});

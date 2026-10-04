import { describe, it, expect } from 'vitest';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { EN } from './dictionary';

// ─────────────────────────────────────────────────────────────────────────────
// Every word a schema puts on screen has an English entry.
//
// Schema labels reach t() through translateSchema(), as variables — so the
// scan for literal t('…') calls cannot see a single one of them. Six scale
// labels and a whole new field group had shipped Hebrew-only that way. Adding
// a field is one line in a schema; this makes the translation part of that
// same line's definition of done.
//
// Strings with no Hebrew in them (LinkedIn, ISO 27001, MRR) are names, not
// words, and are the same in every language.
// ─────────────────────────────────────────────────────────────────────────────

const HEBREW = /[֐-׿]/;

function screenWords(schema) {
  const words = [schema.title, schema.subtitle, schema.singular];
  for (const field of schema.fields || []) {
    words.push(field.label, field.help, ...(field.scaleLabels || []));
    for (const option of field.options || []) words.push(option.label);
  }
  for (const filter of schema.filters || []) {
    words.push(filter.label);
    for (const option of filter.options || []) words.push(option.label);
  }
  return words.filter((w) => typeof w === 'string' && HEBREW.test(w));
}

describe('every schema speaks English too', () => {
  it.each(Object.entries(CRM_SCHEMAS))('%s', (moduleId, schema) => {
    const missing = [...new Set(screenWords(schema))].filter((w) => !EN[w]);
    expect(missing, `${moduleId}: no English for`).toEqual([]);
  });
});

/**
 * Pricing model helpers — shared across wizard, edit form, and overview.
 */

export function isFixedPrice(model) {
  return model === 'fix_price';
}

/**
 * Returns the disabled state + hint for the training hours field.
 * fix_price → disabled with hint; everything else (including empty/undefined) → enabled.
 */
export function hoursFieldState(model) {
  if (isFixedPrice(model)) {
    return { disabled: true, hint: 'לא רלוונטי בפרויקט FIX PRICE' };
  }
  return { disabled: false, hint: null };
}

/**
 * Normalizes the training hours value before saving.
 * fix_price → always null (regardless of value).
 * Empty / non-numeric → null.
 * 0 → 0 (not null).
 */
export function normalizeHoursOnSave(model, value) {
  if (isFixedPrice(model)) return null;
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}
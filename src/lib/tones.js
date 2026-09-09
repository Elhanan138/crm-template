// ─────────────────────────────────────────────────────────────────────────────
// TONES
//
// A tone is what a value MEANS — good, waiting, late, gone — and the schemas
// already say it: 52 options across 33 select fields carry one. Until now that
// meaning only reached the tables; a form dropped it and showed grey.
//
// This is the one place a tone becomes classes. StatusBadge, the segmented
// control and the option dots all read it, so a status cannot be one colour in
// a table and another in the form that sets it.
//
// Semantic tokens only, never a palette colour.
// ─────────────────────────────────────────────────────────────────────────────

export const TONES = ['neutral', 'success', 'warning', 'info', 'destructive', 'accent'];

/** The schemas say `muted` where the badge says `neutral`. Same thing. */
export const normalizeTone = (tone) => (tone === 'muted' || !tone ? 'neutral' : tone);

/** A filled dot — the smallest thing that can carry a meaning. */
export const DOT_CLASS = {
  neutral: 'bg-muted-foreground/40',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
  accent: 'bg-primary',
};

/** A filled surface, for the chosen option of a segmented control. */
export const SURFACE_CLASS = {
  neutral: 'bg-muted text-foreground',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  info: 'bg-info-muted text-info',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent text-accent-foreground',
};

/** Just the ink, for a number or a label that carries its own meaning. */
export const TEXT_CLASS = {
  neutral: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  destructive: 'text-destructive',
  accent: 'text-primary',
};

export const dotFor = (tone) => DOT_CLASS[normalizeTone(tone)] || DOT_CLASS.neutral;
export const surfaceFor = (tone) => SURFACE_CLASS[normalizeTone(tone)] || SURFACE_CLASS.neutral;
export const textFor = (tone) => TEXT_CLASS[normalizeTone(tone)] || TEXT_CLASS.neutral;

/** The tone an option carries, if its schema gave it one. */
export const toneOfOption = (options, value) =>
  normalizeTone((options || []).find((o) => String(o.value) === String(value))?.tone);

// ─────────────────────────────────────────────────────────────────────────────
// Colour that marks everything marks nothing. A form where every field shouts
// is a form where the one late invoice does not stand out, so `destructive` is
// reserved for what genuinely needs acting on and the rest stays quiet.
// ─────────────────────────────────────────────────────────────────────────────

/** A number's tone by what it means, not by its sign. */
export function toneForNumber(value, { warnAbove, badAbove, goodAbove, badBelow } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'neutral';
  if (badBelow !== undefined && n < badBelow) return 'destructive';
  if (badAbove !== undefined && n > badAbove) return 'destructive';
  if (warnAbove !== undefined && n > warnAbove) return 'warning';
  if (goodAbove !== undefined && n > goodAbove) return 'success';
  return 'neutral';
}

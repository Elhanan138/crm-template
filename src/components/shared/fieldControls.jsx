import React from 'react';
import { Input } from '@/components/ui/input';
import { daysUntil, parseDate } from '@/lib/crm/derived';
import { dotFor, textFor, toneForNumber } from '@/lib/tones';
import { useI18n } from '@/lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// FIELD CONTROLS
//
// The small pieces that make a form say what it means rather than only collect
// what you type: a coloured dot beside an option, a scale you press instead of
// a number you guess at, a date that says "in eight days", a percentage you can
// see the size of.
//
// All of them are read from what the schema already declares — the tone on an
// option, the type of the field — so a module written tomorrow gets them
// without asking.
// ─────────────────────────────────────────────────────────────────────────────

/** The meaning of an option, in the smallest possible mark. */
export const ToneDot = ({ tone, className = '' }) => (
  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotFor(tone)} ${className}`} aria-hidden="true" />
);

// ── Scales ───────────────────────────────────────────────────────────────────

// Likelihood and impact were number boxes: you typed a 4 and found out what it
// meant after saving. Five buttons say the range out loud, and the score built
// from them can move while you press.
const SCALE_TONE = ['success', 'success', 'warning', 'warning', 'destructive'];

export function ScaleField({ value, onChange, max = 5, labels, disabled, ariaLabel }) {
  const current = Number(value) || 0;
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex items-center gap-1 h-10">
      {Array.from({ length: max }, (_, i) => i + 1).map((step) => {
        const active = current === step;
        const tone = SCALE_TONE[Math.min(step - 1, SCALE_TONE.length - 1)];
        return (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={labels?.[step - 1] || String(step)}
            title={labels?.[step - 1]}
            disabled={disabled}
            onClick={() => onChange(step)}
            className={`flex-1 h-9 rounded-lg border text-sm font-semibold transition-all disabled:opacity-50 ${
              active
                ? `border-transparent ${textFor(tone)} ring-2 ring-offset-1 ring-current`
                : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {step}
          </button>
        );
      })}
    </div>
  );
}

// ── Percentages ──────────────────────────────────────────────────────────────

/**
 * A percentage with the size of it drawn underneath.
 *
 * `bounds` says when a value stops being ordinary — a negative margin, a
 * discount past what the product allows — so the bar can say so.
 */
export function PercentField({ value, onChange, disabled, dir, bounds, className }) {
  const n = Number(value);
  const shown = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  const tone = toneForNumber(n, bounds);
  return (
    <div className="space-y-1">
      <Input
        type="number" inputMode="decimal" dir="ltr" min="0" max="100"
        value={value} disabled={disabled} onChange={onChange} className={className}
      />
      <div className="h-1 rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-all ${dotFor(tone)}`}
          style={{ width: `${shown}%` }}
          dir={dir}
        />
      </div>
    </div>
  );
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** "In 8 days" / "3 days ago" — the part of a date anyone actually reads. */
export function relativeDay(value) {
  if (!value || !parseDate(value)) return null;
  const days = daysUntil(value);
  if (days === null || days === undefined || !Number.isFinite(days)) return null;
  if (days === 0) return { key: 'היום', tone: 'warning' };
  if (days === 1) return { key: 'מחר', tone: 'warning' };
  if (days === -1) return { key: 'אתמול', tone: 'destructive' };
  if (days < 0) return { key: 'לפני {n} ימים', days: Math.abs(days), tone: 'destructive' };
  return { key: 'בעוד {n} ימים', days, tone: days <= 7 ? 'warning' : 'neutral' };
}

/**
 * The note under a date field. Silent for a date that says nothing yet.
 *
 * The words go through the dictionary like every other string, with the count
 * as a placeholder rather than glued to the front — "5 days ago" and
 * "לפני 5 ימים" put the number in different places.
 */
export function RelativeDayNote({ value }) {
  const { t } = useI18n();
  const rel = relativeDay(value);
  if (!rel) return null;
  return (
    <span className={`text-[11px] ${textFor(rel.tone)}`}>
      {rel.days === undefined ? t(rel.key) : t(rel.key).replace('{n}', rel.days)}
    </span>
  );
}

// ── Money ────────────────────────────────────────────────────────────────────

/**
 * A currency field where the number is the thing and the sign is furniture.
 *
 * Grouping is shown beside the field rather than inside it: rewriting the value
 * under the cursor moves the caret, and a form that fights your typing is worse
 * than one that does not group at all.
 */
export function CurrencyField({ value, onChange, disabled, className }) {
  const n = Number(value);
  const raw = String(value ?? '');
  const formatted = Number.isFinite(n) && raw !== ''
    ? n.toLocaleString('he-IL', { maximumFractionDigits: 2 })
    : null;
  // Below a thousand the grouped form is the typed form, and showing it twice
  // is noise sitting on top of the number it repeats.
  const grouped = formatted && formatted !== raw ? formatted : null;
  return (
    <div className="relative">
      <span className="absolute inset-y-0 start-3 flex items-center text-xs text-muted-foreground pointer-events-none">₪</span>
      <Input
        type="number" inputMode="decimal" dir="ltr"
        value={value} disabled={disabled} onChange={onChange}
        className={`${className} ps-7 text-base font-semibold`}
      />
      {grouped && (
        <span className="absolute inset-y-0 end-3 flex items-center text-[11px] text-muted-foreground pointer-events-none tabular-nums">
          {grouped}
        </span>
      )}
    </div>
  );
}

// ── People ───────────────────────────────────────────────────────────────────

/** Initials, so a name is recognisable before it is read. */
export function PersonAvatar({ name, className = '' }) {
  const initials = String(name || '')
    .trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  if (!initials) return null;
  return (
    <span
      className={`w-6 h-6 rounded-full bg-accent text-primary text-[10px] font-bold
        flex items-center justify-center flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

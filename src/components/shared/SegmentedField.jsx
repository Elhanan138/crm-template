import React from 'react';
import { dotFor, surfaceFor } from '@/lib/tones';

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENTED CHOICE
//
// A short, fixed list of options shown side by side rather than behind a menu:
// priority, status, urgency. Three forms had each grown their own version of
// it, with different heights, different radii and three different ways of
// drawing the same coloured dot.
//
// One control, one look. The option list stays where it belongs — with the
// form that has those options — and only the drawing lives here.
// ─────────────────────────────────────────────────────────────────────────────

export default function SegmentedField({
  value, onChange, options, ariaLabel, disabled, idOf = (o) => o.id,
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 h-10"
    >
      {options.map((option) => {
        const id = idOf(option);
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-semibold transition-all disabled:opacity-50 ${
              active
                ? `${option.active || surfaceFor(option.tone)} shadow-sm`
                : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${option.dot || dotFor(option.tone)}`} />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// INLINE EDIT TRIGGER
//
// The value in a row, when the value itself is what you click to change it.
//
// One click, on the value, within its own bounds — the same gesture everywhere.
// The CRM tables used to ask for a double-click on the whole cell, which is
// both a different gesture and an invisible one: nothing on screen said the
// cell was a target, and a stray double-click anywhere in a row opened an
// editor nobody asked for.
//
// It stops the click from reaching the row, so clicking the value edits it and
// clicking anywhere else in the row still opens the record. That distinction is
// the whole reason the target has visible bounds.
// ─────────────────────────────────────────────────────────────────────────────

export default function InlineEditTrigger({
  onEdit, title, disabled, round, className = '', children,
}) {
  if (disabled) return children;

  return (
    <button
      type="button"
      title={title}
      onClick={(event) => { event.stopPropagation(); onEdit(); }}
      className={`inline-flex items-center gap-1.5 max-w-full text-start align-middle transition-all duration-150
        ${round ? 'rounded-full' : 'rounded-md px-1 -mx-1'}
        hover:ring-2 hover:ring-offset-1 hover:ring-primary/20 hover:bg-muted/50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

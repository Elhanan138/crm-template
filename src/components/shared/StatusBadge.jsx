import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { SURFACE_CLASS, DOT_CLASS } from '@/lib/tones';

// Single source of truth for every status display in the system.
// tones map to semantic tokens only — no hard-coded palette colors.
// The tone→classes map lives in src/lib/tones.js, so a status cannot be one
// colour in a table and another in the form that sets it.
const badge = cva(
  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
  { variants: { tone: SURFACE_CLASS }, defaultVariants: { tone: 'neutral' } },
);

const dotByTone = DOT_CLASS;

// Central dictionary: every status value across every entity → { label (Hebrew), tone }.
export const STATUS_MAP = {
  // Task — two-status model: בטיפול / הושלם
  open:              { label: 'בטיפול',      tone: 'info' },
  in_progress:       { label: 'בטיפול',      tone: 'info' },
  done:              { label: 'הושלם',       tone: 'success' },
  not_started:       { label: 'טרם התחיל',   tone: 'neutral' },
  complete:          { label: 'הושלם',       tone: 'success' },
  paid:              { label: 'שולם',        tone: 'success' },
  // Quote
  draft:             { label: 'טיוטה',       tone: 'neutral' },
  sent:              { label: 'נשלח',        tone: 'info' },
  signed:            { label: 'נחתם',        tone: 'success' },
  rejected:          { label: 'נדחה',        tone: 'destructive' },
  // SupportTicket
  in_review:         { label: 'בבדיקה',      tone: 'warning' },
  resolved:          { label: 'טופל',        tone: 'success' },
  on_hold:           { label: 'מוקפא',       tone: 'neutral' },
  // GanttItem
  stuck:             { label: 'תקוע',        tone: 'destructive' },
  // Sprint
  planning:          { label: 'בתכנון',      tone: 'neutral' },
  active:            { label: 'פעיל',        tone: 'info' },
  completed:         { label: 'הושלם',       tone: 'success' },
  // Playbook
  pending:           { label: 'ממתין',       tone: 'neutral' },
  skipped:           { label: 'דילג',        tone: 'neutral' },
  // Pricing models
  fix_price:         { label: 'מחיר קבוע',   tone: 'accent' },
  hours_bank:        { label: 'בנק שעות',    tone: 'info' },
  // Ticket types
  bug:               { label: 'באג',         tone: 'destructive' },
  improvement:       { label: 'שיפור',       tone: 'info' },
  feature:           { label: "פיצ'ר",       tone: 'success' },
  other:             { label: 'אחר',         tone: 'neutral' },
  // Sources
  manual:            { label: 'ידני',        tone: 'neutral' },
  ai:                { label: 'AI',          tone: 'accent' },
  contract:          { label: 'חוזה',        tone: 'info' },
  // Boolean
  true:              { label: 'כן',          tone: 'success' },
  false:             { label: 'לא',          tone: 'neutral' },
  training:          { label: 'הדרכה',       tone: 'info' },
  failed:            { label: 'נכשל',        tone: 'destructive' },
  // Priorities (shared across Task / SupportTicket / DevItem)
  low:               { label: 'נמוכה',       tone: 'neutral' },
  medium:            { label: 'בינונית',     tone: 'info' },
  high:              { label: 'גבוהה',       tone: 'warning' },
  urgent:            { label: 'דחופה',       tone: 'destructive' },
  critical:          { label: 'קריטית',      tone: 'destructive' },
};

export default function StatusBadge({ status, label, tone, className }) {
  const cfg = STATUS_MAP[status] || {};
  const resolvedTone = tone || cfg.tone || 'neutral';
  const resolvedLabel = label || cfg.label || status;
  return (
    <span className={cn(badge({ tone: resolvedTone }), className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotByTone[resolvedTone])} />
      {resolvedLabel}
    </span>
  );
}
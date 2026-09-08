import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Single source of truth for every status display in the system.
// tones map to semantic tokens only — no hard-coded palette colors.
const badge = cva(
  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        success: 'bg-success-muted text-success',
        warning: 'bg-warning-muted text-warning',
        info: 'bg-info-muted text-info',
        destructive: 'bg-destructive/10 text-destructive',
        accent: 'bg-accent text-accent-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
);

const dotByTone = {
  neutral: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
  accent: 'bg-primary',
};

// Central dictionary: every status value across every entity → { label (Hebrew), tone }.
export const STATUS_MAP = {
  // Task — two-status model: בטיפול / הושלם
  open:              { label: 'בטיפול',      tone: 'info' },
  in_progress:       { label: 'בטיפול',      tone: 'info' },
  done:              { label: 'הושלם',       tone: 'success' },
  // Milestone
  not_started:       { label: 'טרם התחיל',   tone: 'neutral' },
  ready_for_billing: { label: 'מוכן לחיוב',  tone: 'accent' },
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
  // Meeting types
  training:          { label: 'הדרכה',       tone: 'info' },
  meeting:           { label: 'פגישה',        tone: 'accent' },
  workshop:          { label: 'סדנה',        tone: 'warning' },
  demo:              { label: 'דמו',         tone: 'neutral' },
  // MeetingTranscript statuses
  recording:         { label: 'מקליט',       tone: 'warning' },
  uploading:         { label: 'מעלה',        tone: 'info' },
  processing:        { label: 'מעבד',        tone: 'info' },
  ready:             { label: 'מוכן',        tone: 'success' },
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
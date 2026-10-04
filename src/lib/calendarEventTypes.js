import {
  Flag, Rocket, CheckSquare, Bell, FileText, Snowflake, Key, Mail,
} from 'lucide-react';

// Category → design-system tone mapping (for chip rendering)
const CATEGORY_TONES = {
  outlook: 'info',
  task: 'warning',
  reminder: 'accent',
  other: 'neutral',
};

// Filter categories — 4 meaningful options shown in the filter dropdown.
// Events whose type maps to 'other' (kickoff, go_live, licensing, frozen)
// are not individually filterable — they appear only when no type filter is active.
export const CATEGORY_LABELS = {
  outlook: 'פגישות Outlook',
  task: 'משימות',
  reminder: 'תזכורות ומעקבים',
};

// Event type definitions — metadata only, no CSS strings.
// Color = category (tone), icon = specific type.
export const EVENT_TYPES = {
  kickoff:         { label: 'קיקאוף',        icon: Flag,        category: 'other' },
  go_live:         { label: 'עלייה לאוויר',   icon: Rocket,      category: 'other' },
  licensing:       { label: 'רישוי',         icon: Key,         category: 'other' },
  frozen:          { label: 'הקפאה',          icon: Snowflake,   category: 'other' },
  task:            { label: 'משימה',          icon: CheckSquare, category: 'task' },
  reminder:        { label: 'תזכורת',         icon: Bell,        category: 'reminder' },
  outlook:         { label: 'Outlook',        icon: Mail,        category: 'outlook' },
  quote_followup:  { label: 'מעקב הצעה',     icon: FileText,    category: 'reminder' },
};

// Returns the category for an event type, falling back to 'other' for unknown types.
export function eventCategory(type) {
  const cfg = EVENT_TYPES[type];
  return cfg?.category || 'other';
}

// Returns the design-system tone name for an event type.
export function eventTone(type) {
  const cat = eventCategory(type);
  return CATEGORY_TONES[cat] || 'neutral';
}

// Maps an event type to the project tab that shows its details.
export function tabForEvent(type) {
  if (type === 'task') return 'tasks';
  if (type === 'quote_followup') return 'finance';
  if (type === 'reminder') return 'overview';
  return 'overview';
}

// Tone → chip CSS classes (muted bg + solid text + semi-transparent border).
export const TONE_CHIP_CLASSES = {
  neutral:    'bg-muted text-muted-foreground border-border',
  info:       'bg-info-muted text-info border-info/30',
  success:    'bg-success-muted text-success border-success/30',
  warning:    'bg-warning-muted text-warning border-warning/30',
  accent:     'bg-accent text-accent-foreground border-accent/30',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
};

// Tone → dot color (for mobile indicators).
export const TONE_DOT_CLASSES = {
  neutral:    'bg-muted-foreground',
  info:       'bg-info',
  success:    'bg-success',
  warning:    'bg-warning',
  accent:     'bg-primary',
  destructive: 'bg-destructive',
};

// Tone → badge CSS classes (bg + text, no border — for pills).
export const TONE_BADGE_CLASSES = {
  neutral:    'bg-muted text-muted-foreground',
  info:       'bg-info-muted text-info',
  success:    'bg-success-muted text-success',
  warning:    'bg-warning-muted text-warning',
  accent:     'bg-accent text-accent-foreground',
  destructive: 'bg-destructive/10 text-destructive',
};
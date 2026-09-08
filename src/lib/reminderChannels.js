// Unified reminder channel labels — single source of truth for all entities.
// Used by ReminderFields, QuoteForm, MilestoneForm, HighlightForm, etc.

export const REMINDER_CHANNEL_LABELS = {
  bell: 'פעמון',
  email: 'מייל',
  both: 'פעמון + מייל',
};

export const REMINDER_CHANNEL_OPTIONS = Object.entries(REMINDER_CHANNEL_LABELS).map(([value, label]) => ({
  value,
  label,
}));
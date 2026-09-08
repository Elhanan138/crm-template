// Central catalog of all alert triggers and their config field schemas.
// Used by the form (UI), the row renderer, and the backend evaluation engine.

export const TRIGGER_CATALOG = [
  {
    id: 'date_anchor',
    label: 'לפני/אחרי תאריך פרויקט',
    description: 'התראה לפני או אחרי תאריך מרכזי בפרויקט',
    configFields: ['anchor', 'direction', 'days'],
  },
  {
    id: 'task_overdue',
    label: 'משימה באיחור',
    description: 'משימה בפרויקט שתאריך היעד שלה עבר וטרם הושלמה',
    configFields: [],
  },
  {
    id: 'stage_completed',
    label: 'שלב הושלם',
    description: 'שלב בחיי הפרויקט הושלם',
    configFields: [],
  },
  {
    id: 'hours_low',
    label: 'בנק שעות עומד לאזול',
    description: 'ניצול בנק שעות עבר את סף האחוז שהוגדר',
    configFields: ['bank', 'threshold_percent'],
  },
  {
    id: 'quote_followup',
    label: 'מועד פולו-אפ להצעת מחיר',
    description: 'הגיע מועד הפולו-אפ להצעת מחיר שנשלחה',
    configFields: [],
  },
  {
    id: 'one_time',
    label: 'תאריך ושעה קבועים',
    description: 'התראה חד-פעמית בתאריך ובשעה שתקבע',
    configFields: ['datetime'],
  },
  {
    id: 'recurring',
    label: 'חוזר',
    description: 'התראה חוזרת בתדירות שבועית או חודשית',
    configFields: ['frequency', 'day', 'time'],
  },
];

export const DATE_ANCHORS = [
  { id: 'kickoff_date', label: 'קיקאוף', projectField: 'kickoff_date' },
  { id: 'pilot_date', label: 'פיילוט', projectField: 'pilot_date' },
  { id: 'go_live_date', label: 'עלייה לאוויר', projectField: 'go_live_date' },
  { id: 'licensing_start_date', label: 'תחילת רישוי', projectField: 'licensing_start_date' },
  { id: 'frozen_until', label: 'סוף הקפאה', projectField: 'frozen_until' },
];

export const DIRECTIONS = [
  { id: 'before', label: 'לפני' },
  { id: 'after', label: 'אחרי' },
  { id: 'on', label: 'ביום' },
];

export const HOURS_BANKS = [
  { id: 'dev', label: 'פיתוח', purchasedField: 'dev_hours_purchased', usedField: 'dev_hours_used' },
  { id: 'conversion', label: 'הסבה', purchasedField: 'conversion_hours_purchased', usedField: 'conversion_hours_used' },
  { id: 'training', label: 'הדרכה', purchasedField: 'training_hours_purchased', usedField: null },
];

export const WEEK_DAYS = [
  { id: 0, label: 'ראשון' },
  { id: 1, label: 'שני' },
  { id: 2, label: 'שלישי' },
  { id: 3, label: 'רביעי' },
  { id: 4, label: 'חמישי' },
  { id: 5, label: 'שישי' },
  { id: 6, label: 'שבת' },
];

export const RECURRING_FREQUENCIES = [
  { id: 'weekly', label: 'כל שבוע' },
  { id: 'monthly', label: 'כל חודש' },
];

// Build a human-readable Hebrew description of an alert's trigger + config.
export function describeAlert(alert) {
  const trigger = TRIGGER_CATALOG.find(t => t.id === alert.trigger);
  if (!trigger) return alert.trigger;

  const cfg = alert.config || {};
  switch (alert.trigger) {
    case 'date_anchor': {
      const anchor = DATE_ANCHORS.find(a => a.id === cfg.anchor);
      const dir = DIRECTIONS.find(d => d.id === cfg.direction);
      const days = cfg.days || 0;
      if (cfg.direction === 'on') return `ביום ${anchor?.label || ''}`;
      return `${dir?.label || ''} ${days} ימים מ-${anchor?.label || ''}`;
    }
    case 'task_overdue':
      return 'משימה באיחור';
    case 'stage_completed':
      return 'שלב הושלם';
    case 'hours_low': {
      const bank = HOURS_BANKS.find(b => b.id === cfg.bank);
      return `בנק ${bank?.label || ''} — סף ${cfg.threshold_percent || 80}%`;
    }
    case 'quote_followup':
      return 'מועד פולו-אפ להצעת מחיר';
    case 'one_time':
      return 'תאריך ושעה קבועים';
    case 'recurring': {
      const freq = RECURRING_FREQUENCIES.find(f => f.id === cfg.frequency);
      if (cfg.frequency === 'weekly') {
        const day = WEEK_DAYS.find(d => d.id === cfg.day);
        return `${freq?.label || ''} — ${day?.label || ''} ${cfg.time || ''}`;
      }
      return `${freq?.label || ''} — יום ${cfg.day} בחודש ${cfg.time || ''}`;
    }
    default:
      return trigger.label;
  }
}
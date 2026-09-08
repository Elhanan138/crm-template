// Hebrew labels for agent entities, fields, and actions.
// Single source of truth for all UI-facing text in the agent interface.
// Built from the existing ACTION_ENTITY_MAP in agentPlan.ts.

export const ENTITY_LABELS_HE = {
  Task: { one: 'משימה', many: 'משימות' },
  Reminder: { one: 'תזכורת', many: 'תזכורות' },
  ProjectNote: { one: 'דגל', many: 'דגלים' },
  ClientHighlight: { one: 'דגש לקוח', many: 'דגשי לקוח' },
  Milestone: { one: 'אבן דרך', many: 'אבני דרך' },
  MeetingLog: { one: 'פגישה', many: 'פגישות' },
  TaskComment: { one: 'תגובה', many: 'תגובות' },
  SupportTicket: { one: 'פניית תמיכה', many: 'פניות תמיכה' },
  Notification: { one: 'התראה', many: 'התראות' },
  Project: { one: 'פרויקט', many: 'פרויקטים' },
  Quote: { one: 'הצעת מחיר', many: 'הצעות מחיר' },
  GanttItem: { one: 'פריט גאנט', many: 'פריטי גאנט' },
  DevItem: { one: 'פריט פיתוח', many: 'פריטי פיתוח' },
  ProjectChecklistItem: { one: 'פריט צ׳קליסט', many: 'פריטי צ׳קליסט' },
  MeetingTranscript: { one: 'תמלול', many: 'תמלולים' },
  Guide: { one: 'מדריך', many: 'מדריכים' },
  CustomField: { one: 'שדה מותאם', many: 'שדות מותאמים' },
};

/**
 * Returns the Hebrew label for an entity, picking singular vs plural by count.
 * Falls back to the raw entity name if no label exists.
 */
export function entityLabel(entity, count = 1) {
  const labels = ENTITY_LABELS_HE[entity];
  if (!labels) return entity;
  return count === 1 ? labels.one : labels.many;
}

export const FIELD_LABELS_HE = {
  title: 'כותרת',
  name: 'שם',
  due_date: 'תאריך יעד',
  target_date: 'תאריך יעד',
  date: 'תאריך',
  reminder_date: 'תאריך',
  reminder_time: 'שעה',
  time: 'שעה',
  priority: 'עדיפות',
  status: 'סטטוס',
  assigned_to: 'אחראי',
  description: 'תיאור',
  project_id: 'פרויקט',
  message: 'תוכן',
  content: 'תוכן',
  type: 'סוג',
  recipient_email: 'נמען',
  amount: 'סכום',
  hours: 'שעות',
  severity: 'חומרה',
  deadline: 'תאריך יעד',
  billing_amount: 'סכום לחיוב',
  progress: 'התקדמות',
  start_date: 'תאריך התחלה',
  end_date: 'תאריך סיום',
  start_time: 'שעת התחלה',
  end_time: 'שעת סיום',
  implementers: 'מטמיעים',
  billable: 'חיובי',
  summary: 'סיכום',
  attendees: 'משתתפים',
  category: 'קטגוריה',
  notes: 'הערות',
  owner: 'אחראי',
  probability: 'הסתברות',
  impact: 'השפעה',
  mitigation_plan: 'תוכנית טיפול',
  contingency_plan: 'תוכנית מגבה',
  commitment_text: 'טקסט התחייבות',
  source_reference: 'מקור',
  consequence: 'תוצאה',
  label: 'תווית',
  field_type: 'סוג שדה',
  options: 'אפשרויות',
  value: 'ערך',
  order: 'סדר',
  member_action: 'פעולה',
  member_email: 'חבר צוות',
  sent_date: 'תאריך שליחה',
  follow_up_date: 'תאריך מעקב',
  signed_file_url: 'קובץ חתום',
  quote_file_url: 'קובץ הצעה',
  issued_by: 'הונפק על ידי',
  is_resolved: 'פתור',
  is_sent: 'נשלח',
  duration_hours: 'משך בשעות',
  effective_hours: 'שעות אפקטיביות',
  pilot_date: 'תאריך פיילוט',
  kickoff_date: 'תאריך קיקאוף',
  go_live_date: 'תאריך עליה לאוויר',
  licensing_start_date: 'תאריך תחילת רישוי',
  licensing_duration: 'משך רישוי',
  licensing_duration_unit: 'יחידת רישוי',
  training_hours_purchased: 'שעות הכשרה שנרכשו',
  dev_hours_purchased: 'שעות פיתוח שנרכשו',
  conversion_hours_purchased: 'שעות המרה שנרכשו',
  external_consultants: 'יועצים חיצוניים',
  setup_details: 'פרטי הקמה',
  go_live_notes: 'הערות עליה לאוויר',
  frozen_notes: 'הערות הקפאה',
  licensing_reminder_date: 'תאריך תזכורת רישוי',
  playbook_template_id: 'תבנית חיי פרויקט',
  field: 'שדה',
  to: 'נמען',
  subject: 'נושא',
  body: 'תוכן',
};

/**
 * Returns the Hebrew label for a field name.
 * Falls back to the raw field name if no label exists.
 */
export function fieldLabel(field) {
  return FIELD_LABELS_HE[field] || field;
}

export const ACTION_LABELS_HE = {
  createTask: 'יצירת משימה',
  updateTask: 'עדכון משימה',
  markTaskDone: 'השלמת משימה',
  addTaskComment: 'הוספת תגובה',
  addFlag: 'הוספת דגל',
  resolveFlag: 'פתרון דגל',
  createMilestone: 'יצירת אבן דרך',
  updateMilestoneStatus: 'עדכון סטטוס אבן דרך',
  createMeeting: 'יצירת פגישה',
  createReminder: 'יצירת תזכורת',
  revertLastAction: 'ביטול פעולה אחרונה',
  batch: 'פעולות מרובות',
  openGuide: 'פתיחת מדריך',
  applyPlaybook: 'החלת חיי פרויקט',
  summarizeMeetingAction: 'סיכום פגישה',
  createTasksFromMeeting: 'יצירת משימות מפגישה',
  sendEmail: 'שליחת מייל',
  createSupportTicket: 'יצירת פניית תמיכה',
  updateTicketStatus: 'עדכון סטטוס פנייה',
  logMeetingHours: 'רישום שעות פגישה',
  markChecklistItemDone: 'סימון פריט צ׳קליסט',
  addProjectNote: 'הוספת הערה',
  createQuote: 'יצירת הצעת מחיר',
  updateQuoteStatus: 'עדכון סטטוס הצעה',
  createGanttItem: 'יצירת פריט גאנט',
  updateGanttItem: 'עדכון פריט גאנט',
  createCustomField: 'יצירת שדה מותאם',
  manageProjectMembers: 'ניהול חברי צוות',
  createDevItem: 'יצירת פריט פיתוח',
  updateProjectField: 'עדכון שדה פרויקט',
};

/**
 * Returns the Hebrew label for an action.
 * Falls back to the raw action name if no label exists.
 */
export function actionLabel(action) {
  return ACTION_LABELS_HE[action] || action;
}

// ═══════════════════════════════════════════════════════════════
// Enum value → Hebrew display — built from normalizeValues maps (inverted)
// ═══════════════════════════════════════════════════════════════

const PRIORITY_HE = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', urgent: 'דחופה' };
const TASK_STATUS_HE = { open: 'פתוחה', in_progress: 'בתהליך', done: 'הושלמה' };
const MILESTONE_STATUS_HE = { not_started: 'טרם התחילה', in_progress: 'בתהליך', ready_for_billing: 'מוכנה לחיוב', complete: 'הושלמה', paid: 'שולמה' };
const TICKET_STATUS_HE = { open: 'פתוחה', in_review: 'בבדיקה', in_progress: 'בטיפול', on_hold: 'מושהית', resolved: 'טופלה' };
const TICKET_TYPE_HE = { bug: 'באג', improvement: 'שיפור', feature: 'פיתוח', other: 'אחר' };
const MEETING_TYPE_HE = { training: 'הדרכה', meeting: 'פגישה', workshop: 'סדנה', demo: 'הדגמה' };
const GANTT_STATUS_HE = { not_started: 'טרם התחיל', in_progress: 'בתהליך', stuck: 'תקוע', done: 'הושלם' };
const QUOTE_STATUS_HE = { draft: 'טיוטה', sent: 'נשלחה', signed: 'נחתמה', rejected: 'נדחתה' };

const ENUM_HEBREW_MAPS = [
  PRIORITY_HE, TASK_STATUS_HE, MILESTONE_STATUS_HE,
  TICKET_STATUS_HE, TICKET_TYPE_HE, MEETING_TYPE_HE, GANTT_STATUS_HE, QUOTE_STATUS_HE,
];

/**
 * Converts an enum value to its Hebrew display form.
 * Tries all known enum maps to find a match.
 */
export function enumValueHe(value) {
  if (!value) return value;
  for (const map of ENUM_HEBREW_MAPS) {
    if (map[value]) return map[value];
  }
  return value;
}
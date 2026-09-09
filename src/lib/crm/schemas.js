import {
  Filter, Contact, Receipt, Package, Route, TrendingUp,
} from 'lucide-react';
import {
  weightedValue, invoiceBalance, invoiceOverdueDays, marginPercent,
} from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// CRM SCHEMAS
//
// One declarative definition per entity drives the list, the filters, the
// create/edit form, validation and the detail view. Adding a field is one line
// here — no component changes anywhere.
//
// field.type: text | textarea | number | currency | percent | date | select |
//             checkbox | email | phone | url | relation
// field.list: true  → shown as a column in the table / on the card
// field.required    → enforced before save
//
// schema.scope: who may SEE the rows — 'all' | 'own' | 'project' | 'admin'.
//               Declared here, enforced centrally in src/lib/crm/visibility.js
//               for the list, the related-records strip and global search alike.
//               Defaults to 'all' when omitted.
// schema.mineByName: fields that name a person by full name rather than by
//               email, and therefore also count as "mine" under scope 'own'.
// ─────────────────────────────────────────────────────────────────────────────

export const LEAD_STAGES = [
  { value: 'new', label: 'חדש', probability: 10, tone: 'muted' },
  { value: 'qualified', label: 'מוסמך', probability: 25, tone: 'info' },
  { value: 'proposal', label: 'הצעה נשלחה', probability: 50, tone: 'info' },
  { value: 'negotiation', label: 'משא ומתן', probability: 75, tone: 'warning' },
  { value: 'won', label: 'נסגר בהצלחה', probability: 100, tone: 'success' },
  { value: 'lost', label: 'אבוד', probability: 0, tone: 'destructive' },
];

export const OPEN_STAGES = LEAD_STAGES.filter((s) => !['won', 'lost'].includes(s.value));

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'טיוטה', tone: 'muted' },
  { value: 'sent', label: 'נשלחה', tone: 'info' },
  { value: 'partial', label: 'שולמה חלקית', tone: 'warning' },
  { value: 'paid', label: 'שולמה', tone: 'success' },
  { value: 'overdue', label: 'באיחור', tone: 'destructive' },
  { value: 'void', label: 'בוטלה', tone: 'muted' },
];

// ─── Automations ────────────────────────────────────────────────────────────
// Built on the entities that actually exist in this system, so a rule can only
// ever reference a real record type and a real field.

export const AUTOMATION_SUBJECTS = [
  {
    value: 'Lead', label: 'ליד',
    fields: [
      { key: 'stage', label: 'שלב', options: LEAD_STAGES },
      { key: 'value', label: 'שווי', type: 'number' },
      { key: 'source', label: 'מקור' },
      { key: 'owner_email', label: 'בעלים' },
      { key: 'expected_close', label: 'סגירה צפויה', type: 'date' },
    ],
  },
  {
    value: 'Invoice', label: 'חשבונית',
    fields: [
      { key: 'status', label: 'סטטוס', options: INVOICE_STATUSES },
      { key: 'amount', label: 'סכום', type: 'number' },
      { key: 'due_date', label: 'מועד תשלום', type: 'date' },
      { key: 'owner_email', label: 'בעלים' },
    ],
  },
  {
    value: 'Task', label: 'משימה',
    fields: [
      { key: 'status', label: 'סטטוס' },
      { key: 'priority', label: 'עדיפות' },
      { key: 'due_date', label: 'תאריך יעד', type: 'date' },
      { key: 'assigned_to', label: 'משויך ל' },
    ],
  },
  {
    value: 'SupportTicket', label: 'פניית תמיכה',
    fields: [
      { key: 'status', label: 'סטטוס' },
      { key: 'priority', label: 'עדיפות' },
      { key: 'submitted_by_email', label: 'נפתחה על ידי' },
    ],
  },
  {
    value: 'Project', label: 'פרויקט',
    fields: [
      { key: 'pricing_model', label: 'מודל תמחור' },
      { key: 'go_live_date', label: 'תאריך עלייה לאוויר', type: 'date' },
      { key: 'licensing_reminder_date', label: 'תזכורת רישוי', type: 'date' },
      { key: 'project_manager', label: 'מנהל הפרויקט' },
    ],
  },
];

export const AUTOMATION_EVENTS = [
  { value: 'created', label: 'נוצרה רשומה' },
  { value: 'updated', label: 'רשומה עודכנה' },
  { value: 'field_changed', label: 'שדה מסוים השתנה', needsField: true },
  { value: 'date_approaching', label: 'מתקרב תאריך', needsField: true, needsDays: true },
  { value: 'date_passed', label: 'תאריך חלף', needsField: true, needsDays: true },
  { value: 'idle', label: 'ללא עדכון X ימים', needsDays: true },
];

export const CONDITION_OPERATORS = [
  { value: 'eq', label: 'שווה ל' },
  { value: 'neq', label: 'לא שווה ל' },
  { value: 'gt', label: 'גדול מ', numeric: true },
  { value: 'lt', label: 'קטן מ', numeric: true },
  { value: 'contains', label: 'מכיל' },
  { value: 'empty', label: 'ריק', noValue: true },
  { value: 'not_empty', label: 'לא ריק', noValue: true },
];

export const AUTOMATION_ACTIONS = [
  { value: 'create_task', label: 'צור משימה', valueLabel: 'כותרת המשימה' },
  { value: 'set_field', label: 'עדכן שדה', needsField: true, valueLabel: 'ערך חדש' },
  { value: 'assign_owner', label: 'הקצה לבעלים', valueLabel: 'אימייל' },
  { value: 'notify', label: 'שלח התראה', valueLabel: 'נמענים (מופרד בפסיק)' },
  { value: 'send_email', label: 'שלח מייל מתבנית', valueLabel: 'שם התבנית' },
  { value: 'add_tag', label: 'הוסף תגית', valueLabel: 'תגית' },
];

export const subjectMeta = (value) => AUTOMATION_SUBJECTS.find((s) => s.value === value);
export const RUN_MODES = [
  { value: 'auto', label: 'אוטומטי' },
  { value: 'manual', label: 'ידני בלבד' },
];

// Always a picker over the user directory — never free text.
const OWNER_FIELD = {
  key: 'owner_email', label: 'אחראי', type: 'person', by: 'email', list: true,
  help: 'האחראי על הרשומה. משפיע על הרשאות עריכה.',
};

import { SECTOR_SCHEMAS } from './sectorSchemas';

const CORE_SCHEMAS = {
  leads: {
    entity: 'Lead',
    scope: 'own',
    icon: Filter,
    title: 'לידים וצנרת',
    subtitle: 'ניהול הזדמנויות מכירה מהפנייה ועד הסגירה',
    singular: 'ליד',
    titleField: 'name',
    defaultSort: '-created_date',
    searchFields: ['name', 'company', 'contact_name', 'notes'],
    fields: [
      { key: 'name', label: 'שם ההזדמנות', type: 'text', required: true, list: true },
      { key: 'company', label: 'לקוח / ארגון', type: 'text', list: true },
      { key: 'contact_name', label: 'איש קשר', type: 'text', list: true },
      { key: 'contact_email', label: 'אימייל', type: 'email' },
      { key: 'contact_phone', label: 'טלפון', type: 'phone' },
      { key: 'stage', label: 'שלב', type: 'select', options: LEAD_STAGES, required: true, list: true, default: 'new' },
      { key: 'value', label: 'שווי צפוי', type: 'currency', list: true },
      // The number a pipeline is actually judged on: the deal discounted by the
      // probability its own stage already declares.
      { key: 'weighted_value', label: 'שווי משוקלל', type: 'currency', list: true, derive: weightedValue(LEAD_STAGES) },
      { key: 'expected_close', label: 'סגירה צפויה', type: 'date', list: true },
      { key: 'source', label: 'מקור', type: 'select', options: [
        { value: 'inbound', label: 'פנייה נכנסת' },
        { value: 'referral', label: 'המלצה' },
        { value: 'outbound', label: 'יזום' },
        { value: 'campaign', label: 'קמפיין' },
        { value: 'other', label: 'אחר' },
      ] },
      OWNER_FIELD,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [{ key: 'stage', label: 'שלב', options: LEAD_STAGES }],
  },



  contacts: {
    entity: 'CrmContact',
    scope: 'own',
    icon: Contact,
    title: 'אנשי קשר',
    subtitle: 'האנשים שמאחורי הלקוחות',
    singular: 'איש קשר',
    titleField: 'full_name',
    defaultSort: 'full_name',
    searchFields: ['full_name', 'email', 'role', 'phone', 'company'],
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true, list: true },
      { key: 'company', label: 'לקוח / ארגון', type: 'text', list: true },
      { key: 'role', label: 'תפקיד', type: 'text', list: true },
      { key: 'email', label: 'אימייל', type: 'email', list: true },
      { key: 'phone', label: 'טלפון', type: 'phone', list: true },
      { key: 'is_primary', label: 'איש קשר ראשי', type: 'checkbox' },
      OWNER_FIELD,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [],
  },

  invoices: {
    entity: 'Invoice',
    scope: 'own',
    icon: Receipt,
    title: 'חשבוניות וגבייה',
    subtitle: 'מהצעת מחיר לחשבונית, כולל גיול חוב',
    singular: 'חשבונית',
    titleField: 'number',
    defaultSort: '-issue_date',
    searchFields: ['number', 'notes', 'client_name'],
    fields: [
      { key: 'number', label: 'מספר חשבונית', type: 'text', required: true, list: true },
      { key: 'client_name', label: 'לקוח', type: 'text', list: true },
      { key: 'project_id', label: 'פרויקט', type: 'relation', entity: 'Project', labelField: 'client_name' },
      { key: 'status', label: 'סטטוס', type: 'select', options: INVOICE_STATUSES, required: true, list: true, default: 'draft' },
      { key: 'amount', label: 'סכום לפני מע"מ', type: 'currency', required: true, list: true },
      { key: 'vat_percent', label: 'מע"מ %', type: 'percent', default: 18 },
      { key: 'paid_amount', label: 'שולם', type: 'currency', list: true },
      // Gross of VAT and net of what came in — the figure that is actually owed.
      { key: 'balance', label: 'יתרה לתשלום', type: 'currency', list: true, derive: invoiceBalance },
      { key: 'overdue_days', label: 'ימי איחור', type: 'number', list: true, derive: invoiceOverdueDays },
      { key: 'issue_date', label: 'תאריך הנפקה', type: 'date', required: true, list: true },
      { key: 'due_date', label: 'מועד תשלום', type: 'date', list: true },
      OWNER_FIELD,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: INVOICE_STATUSES }],
  },

  products: {
    entity: 'Product',
    icon: Package,
    title: 'מוצרים ומחירונים',
    subtitle: 'קטלוג שירותים, מחירים והנחות',
    singular: 'מוצר',
    titleField: 'name',
    defaultSort: 'name',
    searchFields: ['name', 'sku', 'category', 'description'],
    fields: [
      { key: 'name', label: 'שם המוצר', type: 'text', required: true, list: true },
      { key: 'sku', label: 'מק"ט', type: 'text', list: true },
      { key: 'category', label: 'קטגוריה', type: 'text', list: true },
      { key: 'unit', label: 'יחידה', type: 'select', options: [
        { value: 'hour', label: 'שעה' },
        { value: 'day', label: 'יום' },
        { value: 'month', label: 'חודש' },
        { value: 'unit', label: 'יחידה' },
        { value: 'project', label: 'פרויקט' },
      ], default: 'hour', list: true },
      { key: 'list_price', label: 'מחיר מחירון', type: 'currency', required: true, list: true },
      { key: 'cost', label: 'עלות', type: 'currency' },
      { key: 'margin_percent', label: 'מרווח %', type: 'percent', list: true, derive: marginPercent },
      { key: 'max_discount_percent', label: 'הנחה מרבית %', type: 'percent' },
      { key: 'active', label: 'פעיל', type: 'checkbox', default: true, list: true },
      { key: 'description', label: 'תיאור', type: 'textarea' },
    ],
    filters: [],
  },

  automations: {
    entity: 'AutomationRule',
    scope: 'admin',
    icon: Route,
    title: 'אוטומציות',
    subtitle: 'כללי אם-אז על הישויות שקיימות במערכת',
    singular: 'כלל',
    titleField: 'name',
    defaultSort: 'name',
    searchFields: ['name', 'description'],
    customForm: 'automation',
    fields: [
      { key: 'name', label: 'שם הכלל', type: 'text', required: true, list: true },
      { key: 'subject', label: 'ישות', type: 'select', options: AUTOMATION_SUBJECTS, required: true, list: true },
      { key: 'event', label: 'מתי', type: 'select', options: AUTOMATION_EVENTS, required: true, list: true },
      { key: 'active', label: 'פעיל', type: 'checkbox', default: true, list: true },
      { key: 'run_mode', label: 'הפעלה', type: 'select', options: RUN_MODES, default: 'auto' },
      { key: 'description', label: 'תיאור', type: 'textarea' },
    ],
    filters: [
      { key: 'subject', label: 'ישות', options: AUTOMATION_SUBJECTS },
      { key: 'active', label: 'מצב', options: [
        { value: true, label: 'פעיל' },
        { value: false, label: 'כבוי' },
      ] },
    ],
  },
};

// One registry for every schema-driven module, core and sector alike.
export const CRM_SCHEMAS = { ...CORE_SCHEMAS, ...SECTOR_SCHEMAS };

export const FORECAST_META = {
  icon: TrendingUp,
  title: 'תחזית הכנסות',
  subtitle: 'צנרת משוקללת לפי הסתברות סגירה',
};

export const stageMeta = (value) => LEAD_STAGES.find((s) => s.value === value) || LEAD_STAGES[0];
export const invoiceStatusMeta = (value) => INVOICE_STATUSES.find((s) => s.value === value) || INVOICE_STATUSES[0];

export const TONE_CLASS = {
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-accent text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning-muted text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

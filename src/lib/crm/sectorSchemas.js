import {
  Users, UserPlus, GraduationCap, Boxes, ShoppingCart, Laptop,
  Wrench, ShieldCheck, AlertTriangle, Repeat,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SECTOR MODULES
//
// Ten domains, each declared the same way as the core CRM entities so they get
// the generic list, filters, form, validation, permissions, custom fields, RTL
// layout and mobile cards for free. No module carries bespoke plumbing.
// ─────────────────────────────────────────────────────────────────────────────

const OWNER = {
  key: 'owner_email', label: 'אחראי', type: 'person', by: 'email', list: true,
  help: 'האחראי על הרשומה. משפיע על הרשאות עריכה.',
};

export const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'פעיל', tone: 'success' },
  { value: 'onboarding', label: 'בקליטה', tone: 'info' },
  { value: 'leave', label: 'בחופשה', tone: 'warning' },
  { value: 'ended', label: 'סיים', tone: 'muted' },
];

export const CANDIDATE_STAGES = [
  { value: 'applied', label: 'הוגשה מועמדות', tone: 'muted' },
  { value: 'screening', label: 'סינון', tone: 'info' },
  { value: 'interview', label: 'ראיונות', tone: 'info' },
  { value: 'offer', label: 'הצעה', tone: 'warning' },
  { value: 'hired', label: 'התקבל', tone: 'success' },
  { value: 'rejected', label: 'נדחה', tone: 'destructive' },
];

export const ENROLLMENT_STATUSES = [
  { value: 'assigned', label: 'הוקצה', tone: 'muted' },
  { value: 'in_progress', label: 'בתהליך', tone: 'info' },
  { value: 'completed', label: 'הושלם', tone: 'success' },
  { value: 'overdue', label: 'באיחור', tone: 'destructive' },
];

export const PO_STATUSES = [
  { value: 'draft', label: 'טיוטה', tone: 'muted' },
  { value: 'approved', label: 'מאושרת', tone: 'info' },
  { value: 'ordered', label: 'הוזמנה', tone: 'info' },
  { value: 'received', label: 'התקבלה', tone: 'success' },
  { value: 'cancelled', label: 'בוטלה', tone: 'destructive' },
];

export const ASSET_STATUSES = [
  { value: 'in_use', label: 'בשימוש', tone: 'success' },
  { value: 'storage', label: 'במלאי', tone: 'muted' },
  { value: 'repair', label: 'בתיקון', tone: 'warning' },
  { value: 'retired', label: 'הוצא משימוש', tone: 'destructive' },
];

export const WORK_ORDER_STATUSES = [
  { value: 'open', label: 'פתוחה', tone: 'muted' },
  { value: 'scheduled', label: 'מתוזמנת', tone: 'info' },
  { value: 'in_progress', label: 'בטיפול', tone: 'warning' },
  { value: 'done', label: 'הושלמה', tone: 'success' },
  { value: 'cancelled', label: 'בוטלה', tone: 'destructive' },
];

export const CONTROL_STATUSES = [
  { value: 'not_started', label: 'לא התחיל', tone: 'muted' },
  { value: 'in_progress', label: 'בביצוע', tone: 'info' },
  { value: 'compliant', label: 'עומד בדרישה', tone: 'success' },
  { value: 'gap', label: 'פער', tone: 'destructive' },
  { value: 'na', label: 'לא רלוונטי', tone: 'muted' },
];

export const RISK_LEVELS = [
  { value: 1, label: '1 — נמוך מאוד' },
  { value: 2, label: '2 — נמוך' },
  { value: 3, label: '3 — בינוני' },
  { value: 4, label: '4 — גבוה' },
  { value: 5, label: '5 — קריטי' },
];

export const RISK_RESPONSES = [
  { value: 'mitigate', label: 'הפחתה' },
  { value: 'accept', label: 'קבלה' },
  { value: 'transfer', label: 'העברה' },
  { value: 'avoid', label: 'הימנעות' },
];

export const SUBSCRIPTION_STATUSES = [
  { value: 'trial', label: 'ניסיון', tone: 'info' },
  { value: 'active', label: 'פעיל', tone: 'success' },
  { value: 'past_due', label: 'בפיגור', tone: 'warning' },
  { value: 'churned', label: 'נטש', tone: 'destructive' },
];

export const BILLING_CYCLES = [
  { value: 'monthly', label: 'חודשי', months: 1 },
  { value: 'quarterly', label: 'רבעוני', months: 3 },
  { value: 'yearly', label: 'שנתי', months: 12 },
];

export const SECTOR_SCHEMAS = {
  employees: {
    entity: 'Employee',
    scope: 'admin',
    icon: Users,
    title: 'עובדים',
    subtitle: 'מצבת כוח האדם, תפקידים ומבנה ארגוני',
    singular: 'עובד',
    titleField: 'full_name',
    defaultSort: 'full_name',
    searchFields: ['full_name', 'role', 'department', 'email', 'employee_number'],
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true, list: true },
      { key: 'employee_number', label: 'מספר עובד', type: 'text', list: true },
      { key: 'role', label: 'תפקיד', type: 'text', list: true },
      { key: 'department', label: 'מחלקה', type: 'text', list: true },
      { key: 'manager', label: 'מנהל ישיר', type: 'person', by: 'name' },
      { key: 'status', label: 'סטטוס', type: 'select', options: EMPLOYMENT_STATUSES, required: true, list: true, default: 'active' },
      { key: 'employment_type', label: 'סוג העסקה', type: 'select', options: [
        { value: 'full', label: 'מלאה' },
        { value: 'part', label: 'חלקית' },
        { value: 'contractor', label: 'קבלן' },
        { value: 'student', label: 'סטודנט' },
      ], list: true },
      { key: 'start_date', label: 'תאריך תחילה', type: 'date', list: true },
      { key: 'end_date', label: 'תאריך סיום', type: 'date' },
      { key: 'work_percent', label: 'היקף משרה %', type: 'percent' },
      { key: 'email', label: 'אימייל', type: 'email' },
      { key: 'phone', label: 'טלפון', type: 'phone' },
      { key: 'location', label: 'מיקום', type: 'text' },
      OWNER,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: EMPLOYMENT_STATUSES }],
  },

  recruiting: {
    entity: 'Candidate',
    scope: 'admin',
    icon: UserPlus,
    title: 'גיוס',
    subtitle: 'מועמדים, משרות ושלבי ראיון',
    singular: 'מועמד',
    titleField: 'full_name',
    defaultSort: '-created_date',
    searchFields: ['full_name', 'position', 'source', 'email'],
    boardField: 'stage',
    boardStages: CANDIDATE_STAGES,
    fields: [
      { key: 'full_name', label: 'שם המועמד', type: 'text', required: true, list: true },
      { key: 'position', label: 'משרה', type: 'text', required: true, list: true },
      { key: 'department', label: 'מחלקה', type: 'text', list: true },
      { key: 'stage', label: 'שלב', type: 'select', options: CANDIDATE_STAGES, required: true, list: true, default: 'applied' },
      { key: 'source', label: 'מקור', type: 'select', options: [
        { value: 'referral', label: 'המלצה' },
        { value: 'job_board', label: 'לוח דרושים' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'agency', label: 'חברת השמה' },
        { value: 'direct', label: 'פנייה ישירה' },
      ], list: true },
      { key: 'expected_salary', label: 'ציפיות שכר', type: 'currency' },
      { key: 'interview_date', label: 'ראיון הבא', type: 'date', list: true },
      { key: 'rating', label: 'דירוג 1-5', type: 'number' },
      { key: 'email', label: 'אימייל', type: 'email' },
      { key: 'phone', label: 'טלפון', type: 'phone' },
      { key: 'cv_url', label: 'קורות חיים', type: 'url' },
      OWNER,
      { key: 'notes', label: 'סיכום ראיון', type: 'textarea' },
    ],
    filters: [{ key: 'stage', label: 'שלב', options: CANDIDATE_STAGES }],
  },

  training: {
    entity: 'Enrollment',
    scope: 'own',
    mineByName: ['participant'],
    icon: GraduationCap,
    title: 'הכשרות',
    subtitle: 'קורסים, הקצאות והשלמות',
    singular: 'הכשרה',
    titleField: 'course_name',
    defaultSort: '-due_date',
    searchFields: ['course_name', 'participant', 'category'],
    fields: [
      { key: 'course_name', label: 'שם הקורס', type: 'text', required: true, list: true },
      { key: 'participant', label: 'משתתף', type: 'person', by: 'name', list: true },
      { key: 'category', label: 'קטגוריה', type: 'text', list: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: ENROLLMENT_STATUSES, required: true, list: true, default: 'assigned' },
      { key: 'mandatory', label: 'חובה', type: 'checkbox', list: true },
      { key: 'assigned_date', label: 'תאריך הקצאה', type: 'date' },
      { key: 'due_date', label: 'תאריך יעד', type: 'date', list: true },
      { key: 'completed_date', label: 'תאריך השלמה', type: 'date' },
      { key: 'score', label: 'ציון', type: 'number' },
      { key: 'hours', label: 'שעות', type: 'number' },
      { key: 'certificate_url', label: 'תעודה', type: 'url' },
      OWNER,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: ENROLLMENT_STATUSES }],
  },

  inventory: {
    entity: 'InventoryItem',
    icon: Boxes,
    title: 'מלאי',
    subtitle: 'פריטים, כמויות ונקודות הזמנה',
    singular: 'פריט',
    titleField: 'name',
    defaultSort: 'name',
    searchFields: ['name', 'sku', 'category', 'location'],
    fields: [
      { key: 'name', label: 'שם הפריט', type: 'text', required: true, list: true },
      { key: 'sku', label: 'מק"ט', type: 'text', list: true },
      { key: 'category', label: 'קטגוריה', type: 'text', list: true },
      { key: 'quantity', label: 'כמות במלאי', type: 'number', required: true, list: true },
      { key: 'reorder_point', label: 'נקודת הזמנה', type: 'number', list: true },
      { key: 'unit', label: 'יחידה', type: 'select', options: [
        { value: 'unit', label: 'יחידה' },
        { value: 'box', label: 'קרטון' },
        { value: 'kg', label: 'ק"ג' },
        { value: 'liter', label: 'ליטר' },
        { value: 'meter', label: 'מטר' },
      ], default: 'unit' },
      { key: 'unit_cost', label: 'עלות ליחידה', type: 'currency', list: true },
      { key: 'location', label: 'מיקום במחסן', type: 'text', list: true },
      { key: 'supplier', label: 'ספק', type: 'text' },
      { key: 'active', label: 'פעיל', type: 'checkbox', default: true },
      OWNER,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [],
  },

  purchasing: {
    entity: 'PurchaseOrder',
    icon: ShoppingCart,
    title: 'רכש',
    subtitle: 'הזמנות רכש, ספקים ואישורים',
    singular: 'הזמנה',
    titleField: 'number',
    defaultSort: '-order_date',
    searchFields: ['number', 'supplier', 'description'],
    fields: [
      { key: 'number', label: 'מספר הזמנה', type: 'text', required: true, list: true },
      { key: 'supplier', label: 'ספק', type: 'text', required: true, list: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: PO_STATUSES, required: true, list: true, default: 'draft' },
      { key: 'amount', label: 'סכום', type: 'currency', required: true, list: true },
      { key: 'currency', label: 'מטבע', type: 'select', options: [
        { value: 'ILS', label: '₪ שקל' },
        { value: 'USD', label: '$ דולר' },
        { value: 'EUR', label: '€ אירו' },
      ], default: 'ILS' },
      { key: 'order_date', label: 'תאריך הזמנה', type: 'date', list: true },
      { key: 'expected_date', label: 'אספקה צפויה', type: 'date', list: true },
      { key: 'received_date', label: 'תאריך קבלה', type: 'date' },
      { key: 'approved_by', label: 'אושר על ידי', type: 'person', by: 'name' },
      { key: 'cost_center', label: 'מרכז עלות', type: 'text' },
      OWNER,
      { key: 'description', label: 'פירוט', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: PO_STATUSES }],
  },

  assets: {
    entity: 'Asset',
    icon: Laptop,
    title: 'נכסים וציוד',
    subtitle: 'מלאי ציוד, שיוך לעובדים ואחריות',
    singular: 'נכס',
    titleField: 'name',
    defaultSort: 'name',
    searchFields: ['name', 'serial_number', 'category', 'assigned_to'],
    fields: [
      { key: 'name', label: 'שם הנכס', type: 'text', required: true, list: true },
      { key: 'serial_number', label: 'מספר סידורי', type: 'text', list: true },
      { key: 'category', label: 'קטגוריה', type: 'select', options: [
        { value: 'laptop', label: 'מחשב נייד' },
        { value: 'desktop', label: 'עמדה נייחת' },
        { value: 'phone', label: 'טלפון' },
        { value: 'monitor', label: 'מסך' },
        { value: 'vehicle', label: 'רכב' },
        { value: 'furniture', label: 'ריהוט' },
        { value: 'other', label: 'אחר' },
      ], list: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: ASSET_STATUSES, required: true, list: true, default: 'in_use' },
      { key: 'assigned_to', label: 'משויך ל', type: 'person', by: 'name', list: true },
      { key: 'purchase_date', label: 'תאריך רכישה', type: 'date' },
      { key: 'purchase_cost', label: 'עלות', type: 'currency' },
      { key: 'warranty_until', label: 'אחריות עד', type: 'date', list: true },
      { key: 'location', label: 'מיקום', type: 'text' },
      OWNER,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: ASSET_STATUSES }],
  },

  maintenance: {
    entity: 'WorkOrder',
    icon: Wrench,
    title: 'תחזוקה',
    subtitle: 'קריאות שירות, תזמון וטיפול בשטח',
    singular: 'קריאה',
    titleField: 'title',
    defaultSort: '-scheduled_date',
    searchFields: ['title', 'site', 'description'],
    fields: [
      { key: 'title', label: 'נושא הקריאה', type: 'text', required: true, list: true },
      { key: 'site', label: 'אתר / לקוח', type: 'text', list: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: WORK_ORDER_STATUSES, required: true, list: true, default: 'open' },
      { key: 'priority', label: 'דחיפות', type: 'select', options: [
        { value: 'low', label: 'נמוכה' },
        { value: 'medium', label: 'בינונית' },
        { value: 'high', label: 'גבוהה' },
        { value: 'critical', label: 'קריטית' },
      ], list: true, default: 'medium' },
      { key: 'technician', label: 'טכנאי', type: 'person', by: 'name', list: true },
      { key: 'scheduled_date', label: 'מועד מתוזמן', type: 'date', list: true },
      { key: 'completed_date', label: 'מועד סיום', type: 'date' },
      { key: 'labor_hours', label: 'שעות עבודה', type: 'number' },
      { key: 'parts_cost', label: 'עלות חלקים', type: 'currency' },
      { key: 'sla_due', label: 'יעד SLA', type: 'date' },
      OWNER,
      { key: 'description', label: 'תיאור התקלה', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: WORK_ORDER_STATUSES }],
  },

  compliance: {
    entity: 'ComplianceControl',
    icon: ShieldCheck,
    title: 'תאימות',
    subtitle: 'בקרות רגולציה, ראיות ומועדי ביקורת',
    singular: 'בקרה',
    titleField: 'title',
    defaultSort: 'next_review',
    searchFields: ['title', 'framework', 'control_id', 'description'],
    fields: [
      { key: 'control_id', label: 'מזהה בקרה', type: 'text', list: true },
      { key: 'title', label: 'שם הבקרה', type: 'text', required: true, list: true },
      { key: 'framework', label: 'תקן', type: 'select', options: [
        { value: 'iso27001', label: 'ISO 27001' },
        { value: 'gdpr', label: 'GDPR' },
        { value: 'privacy_il', label: 'תקנות הגנת הפרטיות' },
        { value: 'soc2', label: 'SOC 2' },
        { value: 'internal', label: 'נוהל פנימי' },
      ], list: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: CONTROL_STATUSES, required: true, list: true, default: 'not_started' },
      { key: 'severity', label: 'חומרה', type: 'select', options: RISK_LEVELS, list: true },
      { key: 'last_review', label: 'ביקורת אחרונה', type: 'date' },
      { key: 'next_review', label: 'ביקורת הבאה', type: 'date', list: true },
      { key: 'evidence_url', label: 'קישור לראיה', type: 'url' },
      OWNER,
      { key: 'description', label: 'תיאור ופערים', type: 'textarea' },
    ],
    filters: [
      { key: 'status', label: 'סטטוס', options: CONTROL_STATUSES },
      { key: 'framework', label: 'תקן', options: [
        { value: 'iso27001', label: 'ISO 27001' },
        { value: 'gdpr', label: 'GDPR' },
        { value: 'privacy_il', label: 'תקנות הגנת הפרטיות' },
        { value: 'soc2', label: 'SOC 2' },
        { value: 'internal', label: 'נוהל פנימי' },
      ] },
    ],
  },

  risks: {
    entity: 'Risk',
    icon: AlertTriangle,
    title: 'ניהול סיכונים',
    subtitle: 'מרשם סיכונים, הסתברות מול השפעה',
    singular: 'סיכון',
    titleField: 'title',
    defaultSort: '-created_date',
    searchFields: ['title', 'category', 'description', 'mitigation'],
    fields: [
      { key: 'title', label: 'תיאור הסיכון', type: 'text', required: true, list: true },
      { key: 'category', label: 'קטגוריה', type: 'select', options: [
        { value: 'operational', label: 'תפעולי' },
        { value: 'financial', label: 'פיננסי' },
        { value: 'security', label: 'אבטחה' },
        { value: 'legal', label: 'משפטי' },
        { value: 'people', label: 'כוח אדם' },
        { value: 'vendor', label: 'ספקים' },
      ], list: true },
      { key: 'likelihood', label: 'הסתברות', type: 'select', options: RISK_LEVELS, required: true, list: true, default: 3 },
      { key: 'impact', label: 'השפעה', type: 'select', options: RISK_LEVELS, required: true, list: true, default: 3 },
      { key: 'response', label: 'אסטרטגיה', type: 'select', options: RISK_RESPONSES, list: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: [
        { value: 'open', label: 'פתוח', tone: 'warning' },
        { value: 'monitoring', label: 'במעקב', tone: 'info' },
        { value: 'closed', label: 'נסגר', tone: 'success' },
      ], list: true, default: 'open' },
      { key: 'review_date', label: 'מועד בחינה', type: 'date' },
      OWNER,
      { key: 'mitigation', label: 'תוכנית הפחתה', type: 'textarea' },
      { key: 'description', label: 'פירוט', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: [
      { value: 'open', label: 'פתוח' },
      { value: 'monitoring', label: 'במעקב' },
      { value: 'closed', label: 'נסגר' },
    ] }],
  },

  subscriptions: {
    entity: 'Subscription',
    scope: 'own',
    icon: Repeat,
    title: 'מנויים',
    subtitle: 'הכנסה חוזרת, חידושים ונטישה',
    singular: 'מנוי',
    titleField: 'customer',
    defaultSort: '-start_date',
    searchFields: ['customer', 'plan', 'notes'],
    fields: [
      { key: 'customer', label: 'לקוח', type: 'text', required: true, list: true },
      { key: 'plan', label: 'תוכנית', type: 'text', list: true },
      { key: 'status', label: 'סטטוס', type: 'select', options: SUBSCRIPTION_STATUSES, required: true, list: true, default: 'active' },
      { key: 'amount', label: 'סכום לתקופה', type: 'currency', required: true, list: true },
      { key: 'billing_cycle', label: 'מחזור חיוב', type: 'select', options: BILLING_CYCLES, required: true, list: true, default: 'monthly' },
      { key: 'seats', label: 'מושבים', type: 'number' },
      { key: 'start_date', label: 'תחילת מנוי', type: 'date', list: true },
      { key: 'renewal_date', label: 'חידוש', type: 'date', list: true },
      { key: 'churn_date', label: 'תאריך נטישה', type: 'date' },
      { key: 'churn_reason', label: 'סיבת נטישה', type: 'text' },
      OWNER,
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
    filters: [{ key: 'status', label: 'סטטוס', options: SUBSCRIPTION_STATUSES }],
  },
};

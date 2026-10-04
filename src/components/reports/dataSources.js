import { CheckSquare, FileText, LifeBuoy, AlertOctagon } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

// ── VALUE_LABELS: maps every English enum/field value to Hebrew ──
export const VALUE_LABELS = {
  // Pricing models
  fix_price: 'מחיר קבוע',
  hours_bank: 'בנק שעות',
  '': 'ללא',
  // Task status
  open: 'פתוח',
  in_progress: 'בתהליך',
  done: 'הושלם',
  not_started: 'טרם התחיל',
  complete: 'הושלם',
  paid: 'שולם',
  // Quote status
  draft: 'טיוטה',
  sent: 'נשלח',
  signed: 'נחתם',
  rejected: 'נדחה',
  // Ticket status
  in_review: 'בבדיקה',
  resolved: 'טופל',
  on_hold: 'מוקפא',
  // Ticket types
  bug: 'באג',
  improvement: 'שיפור',
  feature: "פיצ'ר",
  other: 'אחר',
  // Priorities
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  urgent: 'דחופה',
  critical: 'קריטית',
  // Gantt status
  stuck: 'תקוע',
  // Sprint status
  planning: 'בתכנון',
  active: 'פעיל',
  completed: 'הושלם',
  // Playbook
  pending: 'ממתין',
  skipped: 'דילג',
  // Sources
  manual: 'ידני',
  ai: 'AI',
  contract: 'חוזה',
  training: 'הדרכה',
  // Boolean
  true: 'כן',
  false: 'לא',
};

// Every `select` option in every module already carries a Hebrew label. Reading
// them straight from the schemas means a new module needs no entry above — and
// a value can never render as a raw English enum in a report.
const SCHEMA_LABELS = (() => {
  const map = {};
  for (const schema of Object.values(CRM_SCHEMAS)) {
    for (const field of schema.fields || []) {
      for (const option of field.options || []) {
        if (map[option.value] === undefined) map[option.value] = option.label;
      }
    }
  }
  return map;
})();

export function translateValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (VALUE_LABELS[value] !== undefined) return VALUE_LABELS[value];
  if (SCHEMA_LABELS[value] !== undefined) return SCHEMA_LABELS[value];
  return value;
}

// ── DATA_SOURCES: schema definitions for each entity ──
export const DATA_SOURCES = [
  {
    id: 'projects',
    label: 'פרויקטים',
    icon: CubeIcon,
    columns: [
      { key: 'client_name', label: 'לקוח', type: 'text', groupable: true },
      { key: 'name', label: 'שם פרויקט', type: 'text' },
      { key: 'pricing_model', label: 'מודל תמחור', type: 'badge', groupable: true },
      { key: 'contract_value', label: 'ערך חוזה', type: 'currency', aggregatable: true },
      { key: 'project_manager', label: 'מנהל פרויקט', type: 'text', groupable: true },
      { key: 'current_liaison', label: 'מלווה', type: 'text', groupable: true },
      { key: 'pilot_date', label: 'פיילוט', type: 'text', groupable: true },
      { key: 'kickoff_date', label: 'קיקאוף', type: 'date' },
      { key: 'go_live_date', label: 'עלייה לאוויר', type: 'date' },
    ],
  },
  {
    id: 'tasks',
    label: 'משימות',
    icon: CheckSquare,
    columns: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'project_name', label: 'פרויקט', type: 'text', groupable: true, derived: true },
      { key: 'status', label: 'סטטוס', type: 'badge', groupable: true },
      { key: 'priority', label: 'עדיפות', type: 'badge', groupable: true },
      { key: 'assigned_to', label: 'אחראי', type: 'text', groupable: true },
      { key: 'due_date', label: 'תאריך יעד', type: 'date' },
    ],
  },
  {
    id: 'quotes',
    label: 'הצעות מחיר',
    icon: FileText,
    columns: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'project_name', label: 'פרויקט', type: 'text', groupable: true, derived: true },
      { key: 'status', label: 'סטטוס', type: 'badge', groupable: true },
      { key: 'amount', label: 'סכום', type: 'currency', aggregatable: true },
      { key: 'issued_by', label: 'הונפק ע"י', type: 'text', groupable: true },
    ],
  },
  {
    id: 'tickets',
    label: 'פניות',
    icon: LifeBuoy,
    columns: [
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'type', label: 'סוג', type: 'badge', groupable: true },
      { key: 'priority', label: 'עדיפות', type: 'badge', groupable: true },
      { key: 'status', label: 'סטטוס', type: 'badge', groupable: true },
      { key: 'submitted_by', label: 'שולח', type: 'text', groupable: true },
    ],
  },
  {
    id: 'errors',
    label: 'יומן שגיאות',
    icon: AlertOctagon,
    adminOnly: true,
    columns: [
      { key: 'code', label: 'קוד', type: 'badge', groupable: true },
      { key: 'title', label: 'כותרת', type: 'text' },
      { key: 'user_email', label: 'משתמש', type: 'text', groupable: true },
      { key: 'route', label: 'עמוד', type: 'text', groupable: true },
      { key: 'operation', label: 'פעולה', type: 'text', groupable: true },
      { key: 'entity_or_function', label: 'ישות/פונקציה', type: 'text', groupable: true },
      { key: 'status_code', label: 'סטטוס', type: 'number', groupable: true, aggregatable: true },
      { key: 'created_date', label: 'תאריך', type: 'date' },
    ],
  },
];
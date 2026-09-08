/**
 * Agent Capability Registry — single source of truth for all agent capabilities.
 *
 * Each capability defines: feature gating, admin-only flag, suggestion card metadata,
 * and priority ordering for the suggestion grid.
 *
 * Feature IDs match GlobalSystemFeaturesPanel.jsx:
 *   tasks → null (always available)
 *   reminders → null
 *   email → null + adminOnly
 *   tickets → null
 *   guides → null
 */

import { LayoutDashboard, ListTodo, BellRing, CalendarCheck, Target, Mail, LifeBuoy, BookOpen, BookOpenCheck, MessagesSquare, SquareCheckBig, Flag, Undo2, CheckCheck, SquarePen, ScrollText, ListChecks, Clock, FileText, GitBranch, Wrench, Users, FilePlus } from 'lucide-react';

export const CAPABILITIES = [
  {
    id: 'tasks',
    featureId: null,
    adminOnly: false,
    actions: ['createTask', 'updateTask', 'markTaskDone', 'addTaskComment', 'addFlag', 'resolveFlag'],
    card: {
      icon: ListTodo,
      title: 'צור משימה',
      subtitle: 'כותרת, אחראי ותאריך יעד',
      prompt: 'צור משימה',
      scopes: ['project', 'global'],
    },
    cardPriority: 2,
  },
  {
    id: 'reminders',
    featureId: null,
    adminOnly: false,
    actions: ['createReminder'],
    card: {
      icon: BellRing,
      title: 'צור תזכורת',
      subtitle: 'למחר או לתאריך שתבחר',
      prompt: 'תזכיר לי מחר',
      scopes: ['project', 'global'],
    },
    cardPriority: 6,
  },
  {
    id: 'overview',
    featureId: null,
    adminOnly: false,
    actions: [],
    card: {
      icon: LayoutDashboard,
      title: 'סקירת הפרויקט',
      subtitle: 'סטטוס, משימות וסיכונים',
      prompt: 'סכם לי את מצב הפרויקט',
      scopes: ['project'],
    },
    cardPriority: 1,
  },
  {
    id: 'overview_global',
    featureId: null,
    adminOnly: false,
    actions: [],
    card: {
      icon: LayoutDashboard,
      title: 'סקירת מצב',
      subtitle: 'משימות, סיכונים וחריגות',
      prompt: 'מה המצב הכללי שלי?',
      scopes: ['global'],
    },
    cardPriority: 1,
  },
  {
    id: 'email',
    featureId: null,
    adminOnly: true,
    actions: ['sendEmail'],
    card: {
      icon: Mail,
      title: 'שלח מייל',
      subtitle: 'למשתמשים רשומים במערכת',
      prompt: 'שלח מייל',
      scopes: ['project', 'global'],
    },
    cardPriority: 7,
  },
  {
    id: 'tickets',
    featureId: null,
    adminOnly: false,
    actions: ['createSupportTicket', 'updateTicketStatus'],
    card: {
      icon: LifeBuoy,
      title: 'פניית תמיכה',
      subtitle: 'דיווח על בעיה או בקשה',
      prompt: 'פתח קריאת תמיכה',
      scopes: ['project', 'global'],
    },
    cardPriority: 8,
  },
  {
    id: 'guides',
    featureId: null,
    adminOnly: false,
    actions: ['openGuide', 'applyPlaybook'],
    card: {
      icon: BookOpen,
      title: 'פתח מדריך',
      subtitle: 'מדריכים וחיי פרויקט',
      prompt: 'פתח מדריך',
      scopes: ['project', 'global'],
    },
    cardPriority: 9,
  },
  {
    id: 'projects',
    featureId: null,
    adminOnly: false,
    actions: ['updateProjectField'],
    card: {
      icon: SquarePen,
      title: 'עדכן פרויקט',
      subtitle: 'תאריכים, הערות ושדות',
      prompt: 'עדכן פרויקט',
      scopes: ['project'],
    },
    cardPriority: 10,
  },
  {
    id: 'quotes',
    featureId: null,
    adminOnly: false,
    actions: ['createQuote', 'updateQuoteStatus'],
    card: {
      icon: FileText,
      title: 'הצעת מחיר',
      subtitle: 'יצירה ועדכון סטטוס',
      prompt: 'צור הצעת מחיר',
      scopes: ['project'],
    },
    cardPriority: 11,
  },
  {
    id: 'gantt',
    featureId: null,
    adminOnly: false,
    actions: ['createGanttItem', 'updateGanttItem'],
    card: {
      icon: GitBranch,
      title: 'פריט גאנט',
      subtitle: 'יצירה ועדכון',
      prompt: 'צור פריט גאנט',
      scopes: ['project'],
    },
    cardPriority: 12,
  },
  {
    id: 'customFields',
    featureId: null,
    adminOnly: false,
    actions: ['createCustomField'],
    card: {
      icon: FilePlus,
      title: 'שדה מותאם',
      subtitle: 'שדה חדש בפרויקט',
      prompt: 'צור שדה מותאם',
      scopes: ['project'],
    },
    cardPriority: 13,
  },
  {
    id: 'teamManagement',
    featureId: null,
    adminOnly: false,
    actions: ['manageProjectMembers'],
    card: {
      icon: Users,
      title: 'ניהול צוות',
      subtitle: 'הוספה והסרה',
      prompt: 'הוסף חבר צוות',
      scopes: ['project'],
    },
    cardPriority: 14,
  },
  {
    id: 'devItems',
    featureId: null,
    adminOnly: true,
    actions: ['createDevItem'],
    card: {
      icon: Wrench,
      title: 'פריט פיתוח',
      subtitle: 'משימת פיתוח (אדמין)',
      prompt: 'צור פריט פיתוח',
      scopes: ['project', 'global'],
    },
    cardPriority: 15,
  },
  {
    id: 'checklist',
    featureId: null,
    adminOnly: false,
    actions: ['markChecklistItemDone'],
    card: {
      icon: ListChecks,
      title: 'סימון צ׳קליסט',
      subtitle: 'סימון פריט כבוצע',
      prompt: 'סמן פריט צ׳קליסט',
      scopes: ['project'],
    },
    cardPriority: 16,
  },
  {
    id: 'notes',
    featureId: null,
    adminOnly: false,
    actions: ['addProjectNote'],
    card: {
      icon: FileText,
      title: 'הוסף הערה',
      subtitle: 'הערה לפרויקט',
      prompt: 'הוסף הערה',
      scopes: ['project'],
    },
    cardPriority: 17,
  },
];

/**
 * Returns true if a capability is available given the current system/user state.
 * - featureId null → always available (unless adminOnly and user is not admin)
 * - featureId set → must not be in systemDisabledFeatures
 * - adminOnly → user must be admin
 * - userDisabledActions → capability id must not be in the set
 */
export function isCapabilityAvailable(cap, { systemDisabledFeatures, userDisabledActions, isAdmin }) {
  if (cap.adminOnly && !isAdmin) return false;
  if (cap.featureId && systemDisabledFeatures.has(cap.featureId)) return false;
  if (userDisabledActions.has(cap.id)) return false;
  return true;
}

/**
 * Returns exactly 4 suggestion cards for the given scope.
 * Capabilities that are unavailable are replaced by the next in queue.
 *
 * @param {Object} opts
 * @param {'project'|'global'} opts.scope
 * @param {Set} opts.systemDisabledFeatures — feature IDs disabled for this user
 * @param {Set} opts.userDisabledActions — capability IDs the user toggled off
 * @param {boolean} opts.isAdmin
 * @returns {Array} — exactly 4 card objects { icon, title, subtitle, prompt }
 */
export function getSuggestionCards({ scope, systemDisabledFeatures, userDisabledActions, isAdmin }) {
  const available = CAPABILITIES
    .filter(cap => cap.card.scopes.includes(scope))
    .filter(cap => isCapabilityAvailable(cap, { systemDisabledFeatures, userDisabledActions, isAdmin }))
    .sort((a, b) => (a.cardPriority || 99) - (b.cardPriority || 99));

  return available.slice(0, 4).map(cap => cap.card);
}

/**
 * Returns the list of capability groups for the capabilities panel.
 * Filters out capabilities that are system-disabled or admin-only-for-non-admin.
 */
export function getCapabilityGroups({ systemDisabledFeatures, userDisabledActions, isAdmin }) {
  return CAPABILITIES
    .filter(cap => cap.id !== 'overview' && cap.id !== 'overview_global')
    .filter(cap => isCapabilityAvailable(cap, { systemDisabledFeatures, userDisabledActions, isAdmin }))
    .map(cap => ({
      id: cap.id,
      name: CAPABILITY_GROUP_NAMES[cap.id] || cap.id,
      description: CAPABILITY_GROUP_DESCRIPTIONS[cap.id] || '',
    }));
}

const CAPABILITY_GROUP_NAMES = {
  tasks: 'משימות',
  reminders: 'תזכורות',
  email: 'מייל',
  tickets: 'פניות תמיכה',
  guides: 'מדריכים',
  projects: 'פרויקטים',
  quotes: 'הצעות מחיר',
  gantt: 'גאנט',
  customFields: 'שדות מותאמים',
  teamManagement: 'ניהול צוות',
  devItems: 'פריטי פיתוח',
  checklist: 'צ׳קליסט',
  notes: 'הערות פרויקט',
};

const CAPABILITY_GROUP_DESCRIPTIONS = {
  tasks: 'יצירה, עדכון והשלמת משימות',
  reminders: 'יצירת תזכורות אישיות',
  email: 'שליחת מיילים למשתמשים רשומים',
  tickets: 'יצירה ועדכון פניות תמיכה',
  guides: 'פתיחת מדריכים והחלת חיי פרויקט',
  projects: 'עדכון שדות פרויקט בטוחים',
  quotes: 'יצירה ועדכון סטטוס הצעות מחיר',
  gantt: 'יצירה ועדכון פריטי גאנט',
  customFields: 'יצירת שדות מותאמים אישית',
  teamManagement: 'הוספה והסרת חברי צוות',
  devItems: 'יצירת פריטי פיתוח (אדמין)',
  checklist: 'סימון פריטי צ׳קליסט כבוצעו',
  notes: 'הוספת הערות לפרויקט',
};
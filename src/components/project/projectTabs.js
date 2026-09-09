import { DashboardIcon, SectionIcon, FileTextIcon, CheckboxIcon, ReaderIcon } from '@radix-ui/react-icons';

// All tabs are visible to any user with project access (binary — no granular perms).
// The `hidden` flag marks tabs that are opt-in (not shown by default).
export const PROJECT_TABS = [
  { id: 'overview',           label: 'ניהול פרויקט',     icon: DashboardIcon },
  { id: 'notion',             label: 'פתקים',           icon: SectionIcon },
  { id: 'finance',           label: 'הצעות מחיר',       icon: FileTextIcon },
  { id: 'tasks',              label: 'משימות',           icon: CheckboxIcon },
  { id: 'knowledge',          label: 'ניהול ידע',        icon: ReaderIcon, hidden: true },
];

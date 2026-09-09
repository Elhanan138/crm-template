import { differenceInCalendarDays } from 'date-fns';

// Decision-based grouping for the admin workspace — one queue for all development.
export const GROUPS = [
  { key: 'pending', label: 'ממתין להחלטה', defaultCollapsed: false },
  { key: 'working', label: 'בעבודה', defaultCollapsed: false },
  { key: 'on_hold', label: 'מוקפא', defaultCollapsed: true },
  { key: 'recent_resolved', label: 'בוצע לאחרונה', defaultCollapsed: true },
];

export function groupOf(ticket) {
  if (ticket.status === 'open') return 'pending';
  if (ticket.status === 'in_review' || ticket.status === 'in_progress') return 'working';
  if (ticket.status === 'on_hold') return 'on_hold';
  if (ticket.status === 'resolved') {
    const ref = ticket.updated_date || ticket.created_date;
    const days = ref ? differenceInCalendarDays(new Date(), new Date(ref)) : 999;
    return days <= 14 ? 'recent_resolved' : null; // older resolved tickets are hidden from the queue
  }
  return null;
}

export function ticketAgeDays(ticket) {
  return ticket.created_date ? Math.max(0, differenceInCalendarDays(new Date(), new Date(ticket.created_date))) : 0;
}

export function ageTone(days) {
  if (days > 7) return 'destructive';
  if (days > 3) return 'warning';
  return 'neutral';
}

export function ageLabel(days) {
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  return `${days} ימים`;
}

// "קדם" — promote one step forward in the flow.
export function promoteTarget(status) {
  if (status === 'open') return { status: 'in_review', label: 'קדם לבדיקה' };
  if (status === 'in_review') return { status: 'in_progress', label: 'קדם לטיפול' };
  if (status === 'on_hold') return { status: 'in_progress', label: 'החזר לטיפול' };
  return null;
}
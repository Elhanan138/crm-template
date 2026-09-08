import React from 'react';
import { differenceInCalendarDays, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';

// Thin metrics strip above the list — pending decisions, over-a-week, resolved this month.
export default function WorkspaceMetrics({ tickets }) {
  const pending = tickets.filter(t => t.status === 'open').length;
  const overWeek = tickets.filter(t =>
    t.status !== 'resolved' &&
    t.created_date &&
    differenceInCalendarDays(new Date(), new Date(t.created_date)) > 7
  ).length;
  const resolvedThisMonth = tickets.filter(t =>
    t.status === 'resolved' &&
    (t.updated_date || t.created_date) &&
    isSameMonth(new Date(t.updated_date || t.created_date), new Date())
  ).length;

  const items = [
    { label: 'ממתינות להחלטה', value: pending },
    { label: 'מעל שבוע', value: overWeek, destructive: overWeek > 0 },
    { label: 'בוצעו החודש', value: resolvedThisMonth },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((m, i) => (
        <div key={i} className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium',
          m.destructive ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-card text-muted-foreground'
        )}>
          <span className={cn('font-bold text-sm', m.destructive ? 'text-destructive' : 'text-foreground')}>{m.value}</span>
          {m.label}
        </div>
      ))}
    </div>
  );
}
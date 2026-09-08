import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarClock } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';
import DateField from '@/components/ui/date-field';

/**
 * Inline date editor via Popover with DateField inside.
 */
export default function InlineDateCell({ value, onChange, canEdit = true, placeholder = 'ללא תאריך' }) {
  const [open, setOpen] = useState(false);
  const display = value ? formatDate(value, 'day-month-num') : placeholder;

  if (!canEdit) {
    return <span className="text-xs text-muted-foreground">{display}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-primary transition-colors rounded px-1 py-0.5 hover:bg-muted/50 active:scale-95 flex items-center gap-1"
        >
          <CalendarClock className="w-3 h-3" />
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" dir="rtl" className="w-auto p-2" onClick={e => e.stopPropagation()}>
        <DateField
          value={value || ''}
          onChange={v => { onChange(v); setOpen(false); }}
          clearable
        />
      </PopoverContent>
    </Popover>
  );
}
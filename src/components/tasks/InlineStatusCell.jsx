import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import StatusBadge from '@/components/shared/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'טרם התחיל' },
  { value: 'in_progress', label: 'בטיפול' },
  { value: 'stuck', label: 'תקוע' },
  { value: 'done', label: 'הושלמה' },
];

export default function InlineStatusCell({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="rounded-full transition-all duration-150 hover:ring-2 hover:ring-offset-1 hover:ring-primary/20 active:scale-95"
        >
          <StatusBadge status={value || 'in_progress'} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-36 p-1.5" onClick={e => e.stopPropagation()}>
        <div className="space-y-0.5">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={e => { e.stopPropagation(); onChange(s.value); setOpen(false); }}
              className={`w-full flex items-center justify-center px-2 py-1.5 rounded-md transition-colors ${(value || 'in_progress') === s.value ? 'bg-accent' : 'hover:bg-muted/60'}`}
            >
              <StatusBadge status={s.value} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
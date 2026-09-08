import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import StatusBadge from '@/components/shared/StatusBadge';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export default function InlinePriorityCell({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="rounded-full transition-all duration-150 hover:ring-2 hover:ring-offset-1 hover:ring-primary/20 active:scale-95"
        >
          <StatusBadge status={value || 'medium'} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-44 p-1.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {PRIORITY_OPTIONS.map(p => (
            <button
              key={p}
              onClick={e => { e.stopPropagation(); onChange(p); setOpen(false); }}
              className={`rounded-full transition-all ${(value || 'medium') === p ? 'ring-2 ring-primary/30' : 'hover:ring-2 hover:ring-primary/10'}`}
            >
              <StatusBadge status={p} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
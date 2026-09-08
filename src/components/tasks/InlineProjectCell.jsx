import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function InlineProjectCell({ value, onChange, projects = [] }) {
  const [open, setOpen] = useState(false);
  const project = projects.find(p => p.id === value);
  const label = project ? (project.client_name || project.name) : 'שוטף';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-primary transition-colors rounded px-1 py-0.5 hover:bg-muted/50 active:scale-95"
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-48 p-1.5 max-h-60 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="space-y-0.5">
          <button
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
            className={`w-full text-right px-2 py-1.5 rounded-md text-xs transition-colors truncate ${!value ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60 text-muted-foreground'}`}
          >
            שוטף (ללא פרויקט)
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={e => { e.stopPropagation(); onChange(p.id); setOpen(false); }}
              className={`w-full text-right px-2 py-1.5 rounded-md text-xs transition-colors truncate ${value === p.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60 text-muted-foreground'}`}
            >
              {p.client_name || p.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
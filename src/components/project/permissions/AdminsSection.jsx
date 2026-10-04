import React, { useState } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, ShieldCheck } from 'lucide-react';

export default function AdminsSection({ admins }) {
  const [open, setOpen] = useState(false);

  if (!admins.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 py-2 px-1 text-right transition-colors hover:bg-muted/30 rounded-lg"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground flex-1">
            אדמינים (גישה מלאה) · {admins.length}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-1.5 py-1">
          {admins.map(m => (
            <div key={m.id} className="flex items-center gap-1.5 bg-muted/40 rounded-full pe-2.5 ps-1 py-0.5">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">{m.name?.[0] || '?'}</span>
              </div>
              <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{m.name}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
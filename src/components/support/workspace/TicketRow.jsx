import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TYPE_CONFIG } from '../supportConfig';
import StatusBadge from '@/components/shared/StatusBadge';
import InlinePriorityCell from '@/components/tasks/InlinePriorityCell';
import { ticketAgeDays, ageTone, ageLabel } from './supportGroups';
import { resolveSubmitterName } from '@/lib/userDisplay';

export default function TicketRow({ ticket, teamMembers = [], active, selected, onToggleSelect, onOpen, onUpdate }) {
  const tc = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.other;
  const Icon = tc.icon;
  const days = ticketAgeDays(ticket);
  const imgCount = ticket.image_urls?.length || 0;
  const submitterName = resolveSubmitterName(ticket, teamMembers);

  return (
    <div className={cn(
      'flex items-start gap-2.5 px-3 py-3 rounded-lg border transition-colors cursor-pointer',
      active ? 'border-brand/50 bg-accent/40' : selected ? 'border-primary/40 bg-accent' : 'border-border bg-card hover:bg-muted/20'
    )}>
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(ticket.id)}
        className="flex-shrink-0 mt-0.5"
        onClick={e => e.stopPropagation()}
        aria-label="בחירת שורה"
      />
      <div onClick={() => onOpen(ticket)} className="flex-1 min-w-0 text-right cursor-pointer">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', tc.color)} />
          <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <InlinePriorityCell value={ticket.priority} onChange={priority => onUpdate?.(ticket.id, { priority })} />
          <StatusBadge label={ageLabel(days)} tone={ageTone(days)} className="px-2 py-0.5 text-[10px]" />
          {ticket.internal && <StatusBadge label="יזום" tone="accent" className="px-2 py-0.5 text-[10px]" />}
          {submitterName && !ticket.internal && (
            <span className="text-caption flex items-center gap-1 truncate">
              <User className="w-3 h-3" />{submitterName}
            </span>
          )}
          {imgCount > 0 && (
            <span className="text-caption flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />{imgCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
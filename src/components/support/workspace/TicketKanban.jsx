import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TYPE_CONFIG } from '../supportConfig';
import StatusBadge from '@/components/shared/StatusBadge';
import { GROUPS, groupOf } from './supportGroups';
import { resolveSubmitterName } from '@/lib/userDisplay';

// Status a ticket gets when dropped into each column.
const COLUMN_STATUS = { pending: 'open', working: 'in_review', on_hold: 'on_hold', recent_resolved: 'resolved' };

// Secondary kanban view — columns by decision groups, optimistic drag.
export default function TicketKanban({ tickets, teamMembers = [], onOpen, onUpdate }) {
  const columns = GROUPS.map(g => ({ ...g, items: tickets.filter(t => groupOf(t) === g.key) }));

  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const ticket = tickets.find(t => t.id === draggableId);
    if (!ticket) return;
    const destKey = destination.droppableId;
    if (groupOf(ticket) === destKey) return;
    // "working" holds both in_review and in_progress — entering it starts at in_review
    onUpdate(ticket.id, { status: COLUMN_STATUS[destKey] });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2 items-start">
        {columns.map(col => (
          <Droppable key={col.key} droppableId={col.key}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'w-64 sm:w-72 flex-shrink-0 rounded-xl border p-2.5 transition-colors',
                  snapshot.isDraggingOver ? 'border-brand/40 bg-accent/30' : 'border-border bg-muted/30'
                )}
              >
                <div className="flex items-center gap-2 px-1 pb-2">
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{col.items.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {col.items.map((t, idx) => {
                    const tc = TYPE_CONFIG[t.type] || TYPE_CONFIG.other;
                    const Icon = tc.icon;
                    const submitterName = resolveSubmitterName(t, teamMembers);
                    return (
                      <Draggable key={t.id} draggableId={t.id} index={idx}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => onOpen(t)}
                            className={cn(
                              'bg-card border border-border rounded-lg p-3 cursor-pointer shadow-sm',
                              dragSnapshot.isDragging && 'shadow-md ring-1 ring-ring'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', tc.color)} />
                              <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <StatusBadge status={t.priority || 'medium'} className="px-2 py-0.5 text-[10px]" />
                              {t.internal && <StatusBadge label="יזום" tone="accent" className="px-2 py-0.5 text-[10px]" />}
                              {submitterName && !t.internal && (
                                <span className="text-caption flex items-center gap-1 truncate">
                                  <User className="w-3 h-3" />{submitterName}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
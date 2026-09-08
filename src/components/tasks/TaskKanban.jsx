import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatDate } from '@/lib/formatDate';
import { User, Calendar, MessageCircle } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import CompletionCircle from '@/components/tasks/CompletionCircle';

const COLUMNS = [
 { id: 'not_started', label: 'טרם התחיל', tone: 'border-t-muted-foreground' },
 { id: 'in_progress', label: 'בטיפול', tone: 'border-t-info' },
 { id: 'stuck', label: 'תקוע', tone: 'border-t-destructive' },
 { id: 'done', label: 'הושלמו', tone: 'border-t-success' },
];

export default function TaskKanban({ tasks, projectMap, onStatusChange, onEdit, commentCounts = {} }) {
 const byStatus = (status) => tasks.filter(t => (t.status || 'in_progress') === status);

 const handleDragEnd = (result) => {
  if (!result.destination) return;
  const newStatus = result.destination.droppableId;
  if (newStatus !== result.source.droppableId) {
   onStatusChange(result.draggableId, newStatus);
  }
 };

 return (
  <DragDropContext onDragEnd={handleDragEnd}>
   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    {COLUMNS.map(col => {
     const list = byStatus(col.id);
     return (
      <div key={col.id} className={`bg-muted/30 rounded-lg border border-border border-t-4 transition-colors duration-200 ${col.tone}`}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
         <span className="text-sm font-bold text-foreground">{col.label}</span>
         <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full">{list.length}</span>
        </div>
        <Droppable droppableId={col.id}>
         {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={`p-2 space-y-2 min-h-[120px] rounded-b-lg transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-accent/40' : ''}`}>
          {list.map((task, index) => {
           const due = task.due_date && !isNaN(new Date(task.due_date)) ? new Date(task.due_date) : null;
           const isOverdue = due && due < new Date() && task.status !== 'done';
           return (
            <Draggable key={task.id} draggableId={task.id} index={index}>
             {(prov, snapshot) => (
              <div
               ref={prov.innerRef}
               {...prov.draggableProps}
               {...prov.dragHandleProps}
               onClick={() => onEdit(task)}
               className={`bg-card rounded-lg border p-3 cursor-pointer transition-all duration-200 ${(task.status || 'in_progress') === 'done' ? 'opacity-60' : ''} ${snapshot.isDragging ? 'shadow-lg border-primary/40 rotate-2' : 'border-border hover:border-primary/30 hover:shadow-sm'}`}
              >
               <div className="flex items-start gap-2">
                <div className="mt-0.5">
                 <CompletionCircle
                  done={(task.status || 'in_progress') === 'done'}
                  onToggle={() => onStatusChange(task.id, (task.status || 'in_progress') === 'done' ? 'in_progress' : 'done')}
                  title={(task.status || 'in_progress') === 'done' ? 'סמן כלא הושלמה' : 'סמן כהושלמה'}
                 />
                </div>
                <p className={`text-sm font-medium ${(task.status || 'in_progress') === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
               </div>
               {projectMap[task.project_id] && (
                <p className="text-[11px] text-primary mt-0.5">
                 {projectMap[task.project_id].client_name || projectMap[task.project_id].name}
                </p>
               )}
               <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <StatusBadge status={task.priority || 'medium'} />
                {task.assigned_to && (
                 <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3"/>{task.assigned_to}
                 </span>
                )}
                {due && (
                 <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                  <Calendar className="w-3 h-3"/>{formatDate(due, 'short')}
                 </span>
                )}
                {commentCounts[task.id] > 0 && (
                 <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="w-3 h-3"/>{commentCounts[task.id]}
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
        )}
       </Droppable>
      </div>
     );
    })}
   </div>
  </DragDropContext>
 );
}
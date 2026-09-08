import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { useProjectPeople } from '@/hooks/useProjectPeople';
import InlineStatusCell from '@/components/tasks/InlineStatusCell';
import InlineAssigneeCell from '@/components/tasks/InlineAssigneeCell';
import InlineDueDateCell from '@/components/tasks/InlineDueDateCell';
import { Pencil, Trash2, Loader2, User, Calendar, Bell, ListTodo, CheckCheck, Clock, MessageCircle, Plus, GripVertical } from 'lucide-react';
import TaskEditSheet from '@/components/tasks/TaskEditSheet';
import QuickTaskForm from '@/components/tasks/QuickTaskForm';
import { useTaskCommentCounts } from '@/hooks/useTaskCommentCounts';
import { formatDate } from '@/lib/formatDate';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';
import { TABLE, THEAD_ROW, TH, TR_CLICKABLE, TD, TD_MUTED } from '@/components/shared/tableStyles';
import DateField from '@/components/ui/date-field';
import EmptyState from '@/components/shared/EmptyState';

const STATUS_ORDER = ['in_progress', 'done'];

import CompletionCircle from '@/components/tasks/CompletionCircle';

/* ---------- Task card — refreshed, with quick status cycling ---------- */
function TaskCard({ task, onEdit, onDelete, onToggle, onReminder, onCycleStatus, commentCount = 0, innerRef, draggableProps, dragHandleProps }) {
 const due = task.due_date && !isNaN(new Date(task.due_date)) ? new Date(task.due_date) : null;
 const isOverdue = due && due < new Date() && task.status !== 'done';
 const isDone = task.status === 'done';

 return (
  <div
   ref={innerRef}
   {...draggableProps}
   className={`group/card flex items-start gap-2.5 py-2.5 px-3 rounded-lg border transition-all duration-200 animate-slide-in ${isDone ? 'bg-muted/20 border-border/50 opacity-60' : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'}`}
  >
   <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground flex-shrink-0 mt-1">
    <GripVertical className="w-4 h-4"/>
   </div>
   <div className="mt-0.5">
    <CompletionCircle done={isDone} onToggle={() => onToggle(task)} title={isDone ? 'סמן כלא הושלמה' : 'סמן כהושלמה'} />
   </div>
   <div className="flex-1 min-w-0 cursor-pointer"onClick={() => onEdit(task)}>
    <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
    <div className="flex items-center flex-wrap gap-1.5 mt-1">
     <button onClick={() => onCycleStatus(task)} className="rounded-full transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary/20"title="לחץ לשינוי סטטוס">
      <StatusBadge status={task.status || 'in_progress'} />
     </button>
     <StatusBadge status={task.priority || 'medium'} />
     {task.assigned_to && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/>{task.assigned_to}</span>}
     {commentCount > 0 && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3"/>{commentCount}</span>}
     {due && (
      <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
       <Calendar className="w-3 h-3"/>{formatDate(due, 'short')}
      </span>
     )}
    </div>
   </div>
   <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
    <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-warning"aria-label="הוסף תזכורת"title="הוסף תזכורת"onClick={() => onReminder(task)}><Bell className="w-3.5 h-3.5"/></Button>
         <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-foreground"aria-label="ערוך משימה"onClick={() => onEdit(task)}><Pencil className="w-3.5 h-3.5"/></Button>
         <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-destructive"aria-label="מחק משימה"onClick={() => onDelete(task)}><Trash2 className="w-3.5 h-3.5"/></Button>
        </div>
       </div>
      );
    }

    function TaskTableRow({ task, onEdit, onDelete, onToggle, onReminder, onUpdate, teamMembers, commentCount = 0, innerRef, draggableProps, dragHandleProps }) {
 const due = task.due_date && !isNaN(new Date(task.due_date)) ? new Date(task.due_date) : null;
 const isOverdue = due && due < new Date() && task.status !== 'done';
 const isDone = task.status === 'done';

 return (
  <tr
   ref={innerRef}
   {...draggableProps}
   onClick={() => onEdit(task)}
   className={`${TR_CLICKABLE} transition-opacity duration-200 animate-slide-in ${isDone ? 'opacity-60' : ''}`}
  >
   <td className="py-3 px-2"onClick={e => e.stopPropagation()}>
    <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground flex justify-center">
     <GripVertical className="w-4 h-4"/>
    </div>
   </td>
   <td className="py-3 px-2"onClick={e => e.stopPropagation()}>
    <CompletionCircle done={isDone} onToggle={() => onToggle(task)} title={isDone ? 'סמן כלא הושלמה' : 'סמן כהושלמה'} />
   </td>
   <td className={TD}>
    <div className="flex items-center gap-2">
     <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
     {commentCount > 0 && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MessageCircle className="w-3 h-3"/>{commentCount}</span>}
    </div>
   </td>
   <td className="py-3 px-4 align-middle">
    <StatusBadge status={task.priority || 'medium'} />
   </td>
   <td className="py-3 px-4 align-middle">
    <InlineStatusCell value={task.status} onChange={status => onUpdate(task, { status })} />
   </td>
   <td className={TD_MUTED}>
    <InlineAssigneeCell value={task.assigned_to} onChange={assigned_to => onUpdate(task, { assigned_to })} teamMembers={teamMembers} />
   </td>
   <td className={TD_MUTED}>
    <InlineDueDateCell value={task.due_date} onChange={due_date => onUpdate(task, { due_date })} isOverdue={isOverdue} />
   </td>
   <td className="py-3 px-4"onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-start gap-1">
     <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-warning"aria-label="הוסף תזכורת"title="הוסף תזכורת"onClick={() => onReminder(task)}><Bell className="w-3.5 h-3.5"/></Button>
           <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-foreground"aria-label="ערוך משימה"onClick={() => onEdit(task)}><Pencil className="w-3.5 h-3.5"/></Button>
           <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-destructive"aria-label="מחק משימה"onClick={() => onDelete(task)}><Trash2 className="w-3.5 h-3.5"/></Button>
          </div>
         </td>
  </tr>
 );
}

export default function TasksTab({ projectId, project, focusItemId, onFocusHandled }) {
 const queryClient = useQueryClient();
 const [taskDialog, setTaskDialog] = useState({ open: false, task: null });
 const [reminderDialog, setReminderDialog] = useState({ open: false, task: null });
 const [reminderDate, setReminderDate] = useState('');
 const [reminderTime, setReminderTime] = useState('');
 const [reminderMsg, setReminderMsg] = useState('');
 const [filter, setFilter] = useState('in_progress');

 const { data: tasks = [] } = useQuery({
  queryKey: ['tasks', projectId],
  queryFn: () => api.entities.Task.filter({ project_id: projectId }, 'order'),
  enabled: !!projectId,
 });

 // Auto-open edit sheet when arriving from global search
 useEffect(() => {
  if (focusItemId && tasks.length > 0) {
   const task = tasks.find(t => t.id === focusItemId);
   if (task) {
    setTaskDialog({ open: true, task });
    onFocusHandled?.();
   }
  }
 }, [focusItemId, tasks, onFocusHandled]);

 const teamMembers = useProjectPeople(projectId, { includeClient: true });

 const { updateMutation, deleteWithUndo } = useTaskMutations();

 const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });
 const commentCounts = useTaskCommentCounts(projectId);

 const reorderMutation = useMutation({
  mutationFn: (newOrder) => api.entities.Task.bulkUpdate(newOrder.map((t, i) => ({ id: t.id, order: i }))),
  onMutate: async (newOrder) => { await queryClient.cancelQueries({ queryKey: ['tasks', projectId] }); const prev = queryClient.getQueryData(['tasks', projectId]); queryClient.setQueryData(['tasks', projectId], newOrder); return { prev }; },
  onError: (e, n, ctx) => { queryClient.setQueryData(['tasks', projectId], ctx.prev); toast.error('שגיאה בסידור משימות'); },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
 });

 const createReminderMutation = useMutation({
  mutationFn: (data) => api.entities.Reminder.create({ ...data, member_emails: project?.member_emails || [], editor_emails: project?.editor_emails || [] }),
  onSuccess: () => {
   setReminderDialog({ open: false, task: null });
   setReminderDate(''); setReminderTime(''); setReminderMsg('');
   toast.success('תזכורת נשמרה');
  },
  onError: (e) => toast.error(e?.message || 'שמירת התזכורת נכשלה'),
 });

 const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

 const handleTaskDragEnd = (result) => {
  if (!result.destination || result.source.index === result.destination.index) return;
  const next = [...filteredTasks];
  const [moved] = next.splice(result.source.index, 1);
  next.splice(result.destination.index, 0, moved);
  reorderMutation.mutate(next);
 };
 const doneTasks = tasks.filter(t => t.status === 'done').length;
 const inProgress = tasks.filter(t => (t.status || 'in_progress') === 'in_progress').length;
 const progressPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

 const cardHandlers = {
  onEdit: t => setTaskDialog({ open: true, task: t }),
  onDelete: t => deleteWithUndo(t),
  onToggle: t => updateMutation.mutate({ id: t.id, data: { status: t.status === 'done' ? 'in_progress' : 'done' } }),
  onReminder: t => { setReminderDialog({ open: true, task: t }); setReminderMsg(`תזכורת: ${t.title}`); },
  onUpdate: (task, data) => updateMutation.mutate({ id: task.id, data }),
  onCycleStatus: t => {
   const idx = STATUS_ORDER.indexOf(t.status || 'in_progress');
   const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
   updateMutation.mutate({ id: t.id, data: { status: next } });
  },
 };

 const renderSection = (list) => {
  return (
  <div>
   {list.length === 0 ? (
    <EmptyState
     icon={ListTodo}
     title="אין משימות"
     description={filter !== 'all' ? "אין משימות בסטטוס זה.": "צור משימה ראשונה לפרויקט זה."}
     action={
      <Button size="sm"onClick={() => setTaskDialog({ open: true, task: null })} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 px-4 text-xs font-semibold shadow-none gap-1">
       <Plus className="w-3.5 h-3.5"/> משימה חדשה
      </Button>
     }
    />
   ) : (
    <>
     <DragDropContext onDragEnd={handleTaskDragEnd}>
     <div className="hidden md:block overflow-x-auto bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <table className={TABLE}>
       <thead>
        <tr className={THEAD_ROW}>
         <th className="py-3 px-2 w-8"></th>
         <th className="py-3 px-2 w-8"></th>
         <th className={TH}>משימה</th>
         <th className={TH}>עדיפות</th>
         <th className={TH}>סטטוס</th>
         <th className={TH}>אחראי</th>
         <th className={TH}>תאריך יעד</th>
         <th className={TH}>פעולות</th>
        </tr>
       </thead>
       <Droppable droppableId="tasks-table">
        {(provided) => (
         <tbody ref={provided.innerRef} {...provided.droppableProps}>
          {list.map((task, index) => (
           <Draggable key={task.id} draggableId={task.id} index={index}>
            {(p) => (
             <TaskTableRow task={task} innerRef={p.innerRef} draggableProps={p.draggableProps} dragHandleProps={p.dragHandleProps} {...cardHandlers} teamMembers={teamMembers} commentCount={commentCounts[task.id] || 0} />
            )}
           </Draggable>
          ))}
          {provided.placeholder}
         </tbody>
        )}
       </Droppable>
      </table>
     </div>
     </DragDropContext>
     <DragDropContext onDragEnd={handleTaskDragEnd}>
     <Droppable droppableId="tasks-mobile">
      {(provided) => (
       <div ref={provided.innerRef} {...provided.droppableProps} className="md:hidden space-y-1.5">
        {list.map((task, index) => (
         <Draggable key={task.id} draggableId={task.id} index={index}>
          {(p) => (
           <TaskCard task={task} innerRef={p.innerRef} draggableProps={p.draggableProps} dragHandleProps={p.dragHandleProps} {...cardHandlers} commentCount={commentCounts[task.id] || 0} />
          )}
         </Draggable>
        ))}
        {provided.placeholder}
       </div>
      )}
     </Droppable>
     </DragDropContext>
    </>
   )}
  </div>
  );
 };

 const STAT_PILLS = [
  { label: 'בטיפול', value: inProgress, icon: Clock, color: 'text-info bg-info-muted' },
  { label: 'הושלמו', value: doneTasks, icon: CheckCheck, color: 'text-success bg-success-muted' },
 ];

 return (
  <div className="space-y-5">
   {/* Compact header */}
   <div className="flex items-center justify-between gap-3">
    <div>
     <h3 className="text-base font-bold text-foreground">משימות הפרויקט</h3>
     <p className="text-xs text-muted-foreground mt-0.5">{tasks.length} משימות · {progressPct}% הושלמו</p>
    </div>
   </div>

   <QuickTaskForm projects={project ? [project] : []} defaultProjectId={projectId} onOpenFullForm={() => setTaskDialog({ open: true, task: null })} />

   {tasks.length > 0 && (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
     <div className="h-full rounded-full bg-gradient-to-l from-success to-primary transition-all duration-500"style={{ width: `${progressPct}%` }} />
    </div>
   )}

   {/* Filter chips */}
   {tasks.length > 0 && (
    <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1 w-fit">
     {[['all', 'הכל'], ['in_progress', 'בטיפול'], ['done', 'הושלמו']].map(([k, l]) => (
      <button key={k} onClick={() => setFilter(k)}
       className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === k ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
       {l}
      </button>
     ))}
    </div>
   )}

   {tasks.length === 0 ? (
    <div className="text-center py-12 space-y-3 bg-card rounded-lg border border-dashed border-border">
     <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mx-auto"><ListTodo className="w-6 h-6 text-primary"/></div>
     <p className="text-sm text-muted-foreground">אין משימות עדיין — צור משימה בטופס למעלה.</p>
    </div>
   ) : (
    <div className="space-y-4">{renderSection(filteredTasks)}</div>
   )}

   {/* Reminder Dialog */}
   <Dialog open={reminderDialog.open} onOpenChange={open => !open && setReminderDialog({ open: false, task: null })}>
    <DialogContent className="sm:max-w-sm rounded-lg"dir="rtl">
     <DialogHeader>
      <DialogTitle className="text-base font-bold text-right flex items-center gap-2"><Bell className="w-4 h-4 text-warning"/> תזכורת למשימה</DialogTitle>
     </DialogHeader>
     <div className="space-y-4 pt-1">
      <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground">{reminderDialog.task?.title}</div>
      <div className="grid grid-cols-2 gap-2">
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">תאריך תזכורת *</Label>
        <DateField value={reminderDate} onChange={setReminderDate} placeholder="בחר תאריך"className="h-9 text-sm"/>
       </div>
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">שעה (אופציונלי)</Label>
        <Input type="time"value={reminderTime || ''} onChange={e => setReminderTime(e.target.value)} className="h-9 rounded-lg text-sm"/>
       </div>
      </div>
      <div className="space-y-1.5">
       <Label className="text-xs font-medium text-muted-foreground">הודעה</Label>
       <Input value={reminderMsg} onChange={e => setReminderMsg(e.target.value)} placeholder="הודעת תזכורת..."className="h-9 rounded-lg text-sm"/>
      </div>
      <div className="flex gap-2 pt-1">
       <Button disabled={!reminderDate || createReminderMutation.isPending}
        onClick={() => createReminderMutation.mutate({ task_id: reminderDialog.task?.id, project_id: projectId, reminder_date: reminderDate, reminder_time: reminderTime || undefined, message: reminderMsg, recipient_email: currentUser?.email })}
        className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-full h-9 px-5 text-sm shadow-none gap-2">
        {createReminderMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin"/>} הגדר תזכורת
       </Button>
       <Button type="button"variant="outline"onClick={() => setReminderDialog({ open: false, task: null })} className="rounded-full h-9 px-4 text-sm">ביטול</Button>
      </div>
     </div>
    </DialogContent>
   </Dialog>

   {/* Task Sheet */}
   <TaskEditSheet open={taskDialog.open} task={taskDialog.task} projectId={projectId} onClose={() => setTaskDialog({ open: false, task: null })} />

  </div>
 );
}
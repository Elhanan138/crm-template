import React, { useState, useMemo, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckSquare, List, LayoutGrid, User, Calendar, Trash2, MessageCircle, Bell, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import InlineStatusCell from '@/components/tasks/InlineStatusCell';
import InlineAssigneeCell from '@/components/tasks/InlineAssigneeCell';
import InlineDueDateCell from '@/components/tasks/InlineDueDateCell';
import InlineProjectCell from '@/components/tasks/InlineProjectCell';
import InlinePriorityCell from '@/components/tasks/InlinePriorityCell';
import { formatDate } from '@/lib/formatDate';
import DateField from '@/components/ui/date-field';
import PageHeader from '@/components/shared/PageHeader';
import { NAV_ICONS } from '@/lib/navIcons';
import StatusBadge from '@/components/shared/StatusBadge';
import { TABLE, THEAD_ROW, TH, TR_CLICKABLE, TD, TD_MUTED } from '@/components/shared/tableStyles';
import { useAccessControl } from '@/hooks/useAccessControl';
import { cleanEmail } from '@/lib/permissions';
import { cleanName } from '@/lib/dashboardTasks';
import QuickTaskForm from '@/components/tasks/QuickTaskForm';
import TaskEditSheet from '@/components/tasks/TaskEditSheet';
import TaskKanban from '@/components/tasks/TaskKanban';
import { useTaskCommentCounts } from '@/hooks/useTaskCommentCounts';
import CompletionCircle from '@/components/tasks/CompletionCircle';
import TableSkeleton from '@/components/shared/TableSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';

const STATUS_OPTIONS = [
 { value: 'all', label: 'כל הסטטוסים' },
 { value: 'active', label: 'פעילות' },
 { value: 'not_started', label: 'טרם התחיל' },
 { value: 'in_progress', label: 'בטיפול' },
 { value: 'stuck', label: 'תקוע' },
 { value: 'done', label: 'הושלמו' },
];

export default function Tasks() {
 const { canViewProject, isLoading: aclLoading, currentUser, effectiveUser, teamMember, projectPerms, isRealAdmin } = useAccessControl();
 const [view, setView] = useState('list');
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('active');
 const [projectFilter, setProjectFilter] = useState('all');
 const [editTask, setEditTask] = useState(null);
 const [createOpen, setCreateOpen] = useState(false);
 const [reminderDialog, setReminderDialog] = useState({ open: false, task: null });
 const [reminderDate, setReminderDate] = useState('');
 const [reminderTime, setReminderTime] = useState('');
 const [reminderMsg, setReminderMsg] = useState('');
 const [page, setPage] = useState(1);
 const PAGE_SIZE = 10;

 const myName = teamMember?.name || effectiveUser?.full_name || '';
 // Load ALL RLS-visible tasks (same as dashboard), then filter client-side
 // to "mine" using the same unified definition (assigned_to me OR unassigned
 // in my projects) so the count matches the dashboard widget exactly.
 const { data: allTasks = [], isLoading } = useQuery({
  queryKey: ['allTasksGlobal', myName, 'unified'],
  queryFn: () => api.entities.Task.list('-created_date', 300),
 });
 const { data: projects = [] } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.entities.Project.list(),
 });
 const { data: teamMembers = [] } = useQuery({
  queryKey: ['teamMembers'],
  queryFn: () => api.entities.TeamMember.list('name'),
 });
 const commentCounts = useTaskCommentCounts();
 const { updateMutation, deleteWithUndo } = useTaskMutations();

 const createReminderMutation = useMutation({
  mutationFn: (data) => {
   const project = projects.find(p => p.id === data.project_id);
   return api.entities.Reminder.create({ ...data, member_emails: project?.member_emails || [], editor_emails: project?.editor_emails || [] });
  },
  onSuccess: () => {
   setReminderDialog({ open: false, task: null });
   setReminderDate(''); setReminderTime(''); setReminderMsg('');
   toast.success('תזכורת נשמרה');
  },
 });

 const openReminder = (task) => { setReminderDialog({ open: true, task }); setReminderMsg(`תזכורת: ${task.title}`); };

 // Only projects the user is actually a member of: project manager / liaison /
 // creator / explicit per-project permission — not every project in the system.
 const visibleProjects = useMemo(() => {
  const myEmail = effectiveUser?.email;
  const myName = teamMember?.name;
  return projects.filter(p => {
    if (isRealAdmin) return true;
    if (!canViewProject(p.id)) return false;
   if (myName && (p.project_manager === myName || p.current_liaison === myName)) return true;
   if (currentUser?.id && p.created_by_id === currentUser.id) return true;
   return projectPerms.some(pp => pp.project_id === p.id && cleanEmail(pp.member_email) === myEmail);
  });
 }, [projects, canViewProject, currentUser, effectiveUser, teamMember, projectPerms]);
 const projectMap = useMemo(() => Object.fromEntries(visibleProjects.map(p => [p.id, p])), [visibleProjects]);

 // Unified "my tasks" filter — identical to dashboard's selectMyTasks:
 // (a) assigned_to === my name (normalized), OR
 // (b) unassigned (empty assigned_to) AND in a project I'm PM/liaison of.
 const myCleanName = cleanName(myName);
 const filtered = allTasks.filter(t => {
   if (!t) return false;
   const assignedToName = cleanName(t.assigned_to);
   const assignedToMe = myCleanName && assignedToName === myCleanName;
   if (!assignedToMe) return false;
  if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
  const taskStatus = t.status || 'in_progress';
  if (statusFilter === 'active') {
   if (taskStatus === 'done') return false;
  } else if (statusFilter !== 'all' && taskStatus !== statusFilter) return false;
  if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
  return true;
 });

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, projectFilter, view]);

  // Paginate filtered tasks
  const paginatedTasks = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


  return (
  <div dir="rtl">
   <PageHeader
    icon={NAV_ICONS.tasks}
    title="משימות"
    subtitle="כל המשימות מכל הפרויקטים"
    actions={
     <div className="flex items-center gap-0.5 bg-muted/60 rounded-full p-0.5">
      {[{ id: 'list', label: 'רשימה', icon: List }, { id: 'kanban', label: 'קנבן', icon: LayoutGrid }].map(v => {
       const Icon = v.icon;
       return (
        <button
         key={v.id}
         onClick={() => setView(v.id)}
         className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${view === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
         <Icon className="w-3.5 h-3.5"/>
         <span className="hidden sm:inline">{v.label}</span>
        </button>
       );
      })}
     </div>
    }
   />

   <div className="space-y-4">
    <QuickTaskForm projects={visibleProjects} onOpenFullForm={() => setCreateOpen(true)} />

    {/* Filters */}
    <div className="flex items-center gap-2 flex-wrap">
     <Input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="חיפוש משימה..."
      className="h-9 rounded-full text-sm w-full sm:w-56"
      dir="rtl"
     />
     <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="h-9 rounded-full text-xs w-32"><SelectValue /></SelectTrigger>
      <SelectContent dir="rtl">{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
     </Select>
     <Select value={projectFilter} onValueChange={setProjectFilter}>
      <SelectTrigger className="h-9 rounded-full text-xs w-40 text-right [&>span]:text-right"><SelectValue /></SelectTrigger>
      <SelectContent dir="rtl">
       <SelectItem value="all">כל הפרויקטים</SelectItem>
       {visibleProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>)}
      </SelectContent>
     </Select>
    </div>

    {isLoading || aclLoading ? (
     <TableSkeleton rows={6} cols={5} />
    ) : filtered.length === 0 ? (
     <EmptyState
      icon={NAV_ICONS.tasks}
      title="אין משימות"
      description="צור משימה ראשונה כדי להתחיל לעקוב אחר העבודה."
      action={
       <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-9 text-sm font-semibold shadow-none gap-2">
        <CheckSquare className="w-4 h-4"/> צור משימה
       </Button>
      }
     />
    ) : view === 'kanban' ? (
     <TaskKanban
      tasks={filtered}
      projectMap={projectMap}
      commentCounts={commentCounts}
      onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
      onEdit={setEditTask}
     />
    ) : (
     <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto bg-card rounded-lg border border-border shadow-sm">
       <table className={TABLE}>
        <thead>
         <tr className={THEAD_ROW}>
          <th className="py-3 px-2 w-8"></th>
          <th className={TH}>משימה</th>
          <th className={TH}>פרויקט</th>
          <th className={TH}>עדיפות</th>
          <th className={TH}>סטטוס</th>
          <th className={TH}>אחראי</th>
          <th className={TH}>תאריך יעד</th>
          <th className={TH}>פעולות</th>
         </tr>
        </thead>
        <tbody>
         {paginatedTasks.map(task => {
          const due = task.due_date && !isNaN(new Date(task.due_date)) ? new Date(task.due_date) : null;
          const isOverdue = due && due < new Date() && task.status !== 'done';
          const project = projectMap[task.project_id];
          const isDone = task.status === 'done';
          return (
           <tr key={task.id} onClick={() => setEditTask(task)} className={`${TR_CLICKABLE} transition-opacity duration-200 animate-slide-in ${isDone ? 'opacity-60' : ''}`}>
            <td className="py-3 px-2"onClick={e => e.stopPropagation()}>
             <CompletionCircle done={isDone} onToggle={() => updateMutation.mutate({ id: task.id, data: { status: isDone ? 'in_progress' : 'done' } })} title={isDone ? 'סמן כלא הושלמה' : 'סמן כהושלמה'} />
            </td>
            <td className={TD}>
             <div className="flex items-center gap-2">
              <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
              {commentCounts[task.id] > 0 && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MessageCircle className="w-3 h-3"/>{commentCounts[task.id]}</span>}
             </div>
            </td>
            <td className={TD_MUTED}><InlineProjectCell value={task.project_id} onChange={project_id => updateMutation.mutate({ id: task.id, data: { project_id } })} projects={visibleProjects} /></td>
            <td className="py-3 px-4"><InlinePriorityCell value={task.priority} onChange={priority => updateMutation.mutate({ id: task.id, data: { priority } })} /></td>
            <td className="py-3 px-4"><InlineStatusCell value={task.status} onChange={status => updateMutation.mutate({ id: task.id, data: { status } })} /></td>
            <td className={TD_MUTED}>
             <InlineAssigneeCell value={task.assigned_to} onChange={assigned_to => updateMutation.mutate({ id: task.id, data: { assigned_to } })} teamMembers={teamMembers} />
            </td>
            <td className={TD_MUTED}>
             <InlineDueDateCell value={task.due_date} onChange={due_date => updateMutation.mutate({ id: task.id, data: { due_date } })} isOverdue={isOverdue} />
            </td>
            <td className="py-3 px-4"onClick={e => e.stopPropagation()}>
             <div className="flex items-center gap-1">
              <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-warning"aria-label="הוסף תזכורת"title="הוסף תזכורת"onClick={() => openReminder(task)}><Bell className="w-3.5 h-3.5"/></Button>
                             <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-destructive"aria-label="מחק משימה"onClick={() => deleteWithUndo(task)}><Trash2 className="w-3.5 h-3.5"/></Button>
             </div>
            </td>
           </tr>
          );
         })}
        </tbody>
       </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
       {paginatedTasks.map(task => {
        const due = task.due_date && !isNaN(new Date(task.due_date)) ? new Date(task.due_date) : null;
        const isOverdue = due && due < new Date() && task.status !== 'done';
        const project = projectMap[task.project_id];
        const isDone = task.status === 'done';
        return (
         <div key={task.id} onClick={() => setEditTask(task)} className={`bg-card rounded-lg border border-border p-3.5 cursor-pointer hover:border-primary/30 transition-all duration-200 animate-slide-in ${isDone ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between gap-2">
           <div className="mt-0.5">
            <CompletionCircle done={isDone} onToggle={() => updateMutation.mutate({ id: task.id, data: { status: isDone ? 'in_progress' : 'done' } })} title={isDone ? 'סמן כלא הושלמה' : 'סמן כהושלמה'} />
           </div>
           <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
            <div className="mt-0.5"><InlineProjectCell value={task.project_id} onChange={project_id => updateMutation.mutate({ id: task.id, data: { project_id } })} projects={visibleProjects} /></div>
           </div>
           <div className="flex items-center gap-0.5 flex-shrink-0">
            <StatusBadge status={task.status || 'in_progress'} />
            <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-warning"aria-label="הוסף תזכורת"onClick={e => { e.stopPropagation(); openReminder(task); }}><Bell className="w-3.5 h-3.5"/></Button>
                         <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground hover:text-destructive"aria-label="מחק משימה"onClick={e => { e.stopPropagation(); deleteWithUndo(task); }}><Trash2 className="w-3.5 h-3.5"/></Button>
           </div>
          </div>
          <div className="flex items-center flex-wrap gap-1.5 mt-2">
           <InlinePriorityCell value={task.priority} onChange={priority => updateMutation.mutate({ id: task.id, data: { priority } })} />
           {task.assigned_to && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/>{task.assigned_to}</span>}
           {commentCounts[task.id] > 0 && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><MessageCircle className="w-3 h-3"/>{commentCounts[task.id]}</span>}
           {due && (
            <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
             <Calendar className="w-3 h-3"/>{formatDate(due, 'short')}
            </span>
           )}
           </div>
         </div>
        );
       })}
      </div>
      </>
      )}
      {filtered.length > PAGE_SIZE && view === 'list' && (
      <Pagination
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
      )}
      </div>

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
        onClick={() => createReminderMutation.mutate({ task_id: reminderDialog.task?.id, project_id: reminderDialog.task?.project_id, reminder_date: reminderDate, reminder_time: reminderTime || undefined, message: reminderMsg, recipient_email: currentUser?.email })}
        className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-full h-9 px-5 text-sm shadow-none gap-2">
        {createReminderMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin"/>} הגדר תזכורת
       </Button>
       <Button type="button"variant="outline"onClick={() => setReminderDialog({ open: false, task: null })} className="rounded-full h-9 px-4 text-sm">ביטול</Button>
      </div>
     </div>
    </DialogContent>
   </Dialog>

   <TaskEditSheet open={!!editTask || createOpen} task={editTask} onClose={() => { setEditTask(null); setCreateOpen(false); }} />

  </div>
 );
}
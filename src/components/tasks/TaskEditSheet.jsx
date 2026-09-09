import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useEntityCustomFields } from '@/lib/useCustomFields';
import TaskFormFields from '@/components/tasks/TaskFormFields';
import { useFormLayout } from '@/lib/useFormLayout';
import { Loader2, Check, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import TaskComments from '@/components/tasks/TaskComments';
import { useProjectPeople } from '@/hooks/useProjectPeople';

export default function TaskEditSheet({ open, task, projectId, onClose }) {
 const queryClient = useQueryClient();

 const isEditing = !!task;
 const taskId = task?.id;
 const [form, setForm] = useState({});
 const teamMembers = useProjectPeople(form?.project_id || projectId, { includeClient: true });
 const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });
 const [saving, setSaving] = useState(false);
 const [creating, setCreating] = useState(false);
 const [showComments, setShowComments] = useState(false);
 const skipSave = useRef(true);
 const commentsInited = useRef(false);
 const formRef = useRef({});
 const taskRef = useRef(null);
 formRef.current = form;
 taskRef.current = task;

 const { data: taskComments = [] } = useQuery({
  queryKey: ['taskComments', taskId],
  queryFn: () => api.entities.TaskComment.filter({ task_id: taskId }, 'created_date'),
  enabled: !!taskId,
 });

 // Auto-expand the comments section when the task already has comments.
 useEffect(() => {
  if (!commentsInited.current && taskComments.length > 0) {
   setShowComments(true);
   commentsInited.current = true;
  }
 }, [taskComments.length]);

 const { data: allProjects = [] } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.entities.Project.list(),
  enabled: !task && !projectId,
 });

 useEffect(() => {
  setForm({
   title: task?.title || '',
   assigned_to: task?.assigned_to || '',
   due_date: task?.due_date || '',
   priority: task?.priority || 'medium',
   status: task?.status || 'not_started',
   checklist: task?.checklist || [],
   show_in_gantt: task?.show_in_gantt || false,
   project_id: task?.project_id || projectId || '',
   custom_fields: task?.custom_fields || {},
  });
  skipSave.current = true;
 }, [taskId, open, projectId]);

 const doSave = useCallback((data) => {
  const t = taskRef.current;
  if (!t || !data.title?.trim()) return;
  const clean = { ...data };
  if (!clean.due_date) delete clean.due_date;
  if (!clean.assigned_to) delete clean.assigned_to;
  setSaving(true);
  api.entities.Task.update(t.id, clean)
   .then(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['allTasksGlobal'] });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
   })
   .catch(() => {
    toast.error('שמירה נכשלה');
    // Revert form to the server's last known state
    skipSave.current = true;
    const t = taskRef.current;
    setForm({
     title: t?.title || '',
     assigned_to: t?.assigned_to || '',
     due_date: t?.due_date || '',
     priority: t?.priority || 'medium',
     status: t?.status || 'in_progress',
     checklist: t?.checklist || [],
     show_in_gantt: t?.show_in_gantt || false,
     project_id: t?.project_id || projectId || '',
    });
   })
   .finally(() => setSaving(false));
 }, [queryClient, projectId]);

 useEffect(() => {
  if (skipSave.current) { skipSave.current = false; return; }
  if (!isEditing || !open || !form.title?.trim()) return;
  const timer = setTimeout(() => doSave(formRef.current), 600);
  return () => clearTimeout(timer);
 }, [form, isEditing, open, doSave]);

 const handleClose = () => {
  if (isEditing && formRef.current.title?.trim()) {
   doSave(formRef.current);
  }
  onClose();
 };

 const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

 const handleCreate = () => {
  if (!form.title?.trim()) { toast.error('כותרת חובה'); return; }
  setCreating(true);
  const clean = { ...form, project_id: form.project_id || projectId || '' };
  if (!clean.project_id) delete clean.project_id;
  if (!clean.due_date) delete clean.due_date;
  if (!clean.assigned_to) delete clean.assigned_to;
  delete clean.checklist;

  const onSuccess = () => {
   queryClient.invalidateQueries({ queryKey: ['tasks'] });
   queryClient.invalidateQueries({ queryKey: ['allTasksGlobal'] });
   queryClient.invalidateQueries({ queryKey: ['allTasks'] });
   toast.success('משימה נוצרה');
   onClose();
  };

  if (clean.project_id) {
   api.entities.Project.get(clean.project_id)
    .then(project => api.entities.Task.create({
     ...clean,
     member_emails: project?.member_emails || [],
     editor_emails: project?.editor_emails || [],
    }))
    .then(onSuccess)
    .catch(() => toast.error('יצירה נכשלה'))
    .finally(() => setCreating(false));
  } else {
   const myEmail = currentUser?.email || '';
   api.entities.Task.create({
    ...clean,
    member_emails: myEmail ? [myEmail] : [],
    editor_emails: myEmail ? [myEmail] : [],
   })
    .then(onSuccess)
    .catch(() => toast.error('יצירה נכשלה'))
    .finally(() => setCreating(false));
  }
 };


 const customFields = useEntityCustomFields('Task');
 const layout = useFormLayout('Task', customFields);


 return (
  <Sheet open={open} onOpenChange={o => !o && handleClose()}>
   <SheetContent side="left"className="w-full sm:max-w-lg p-0 flex flex-col">
    <SheetHeader className="px-5 py-3.5 border-b border-border text-right shrink-0 flex-row items-center justify-between">
     <SheetTitle className="text-base font-bold leading-tight">
      {isEditing ? 'עריכת משימה' : 'משימה חדשה'}
     </SheetTitle>
     {saving && (
      <span className="flex items-center gap-1.5 text-caption">
       <Loader2 className="w-3.5 h-3.5 animate-spin"/> שומר…
      </span>
     )}
    </SheetHeader>

    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
     {/* The same renderer the layout preview uses, so what is arranged in
         הגדרות → שדות מותאמים is exactly what is rendered here. */}
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TaskFormFields
      form={form}
      set={set}
      layout={layout}
      customFields={customFields}
      isEditing={isEditing}
      projectId={projectId}
      allProjects={allProjects}
      teamMembers={teamMembers}
      />
     </div>

     {/* Create button — only for new tasks */}
     {!isEditing && (
      <Button
       onClick={handleCreate}
       disabled={creating}
       className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-6 text-sm shadow-none gap-2"
      >
       {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-4 h-4"/>}
       צור משימה
      </Button>
     )}

     {/* Comments — collapsible */}
     {task && (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
       <button
        onClick={() => setShowComments(s => !s)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors"
       >
        <div className="flex items-center gap-2">
         <MessageCircle className="w-3.5 h-3.5 text-muted-foreground"/>
         <h3 className="text-xs font-semibold text-foreground">תגובות</h3>
        </div>
        {showComments ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground"/> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground"/>}
       </button>
       {showComments && (
        <div className="px-4 pb-4 pt-1 border-t border-border">
         <TaskComments task={task} />
        </div>
       )}
      </div>
     )}
    </div>
   </SheetContent>
  </Sheet>
 );
}
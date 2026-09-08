import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Bell, Plus, Activity, AlertTriangle, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import ProjectAlertRow from './ProjectAlertRow';
import ProjectAlertForm from './ProjectAlertForm';
import { describeAlert } from './alertConfig';
import { useAuth } from '@/lib/AuthContext';

export default function ProjectAlertsSheet({ open, onOpenChange, project, teamMembers, currentUserEmail }) {
 const queryClient = useQueryClient();
 const [showForm, setShowForm] = useState(false);
 const [editingAlert, setEditingAlert] = useState(null);
 const { currentUser } = useAuth();
 const isAdmin = currentUser?.role === 'admin';

 const queryKey = ['project-alerts', project?.id];

 const { data: alerts = [], isLoading } = useQuery({
  queryKey,
  queryFn: () => api.entities.ProjectAlert.filter({ project_id: project.id }),
  enabled: !!project?.id && open,
 });

 // Heartbeat status — calls runAlertsIfDue on open (doubles as a heartbeat trigger)
 const { data: heartbeatStatus } = useQuery({
  queryKey: ['alerts-heartbeat-status'],
  queryFn: () => api.functions.invoke('runAlertsIfDue', {}),
  enabled: open,
  staleTime: 60 * 1000,
 });

 // Today's notifications for this project (per-user, RLS-scoped)
 const todayStr = new Date().toISOString().slice(0, 10);
 const { data: projectNotifs = [] } = useQuery({
  queryKey: ['project-alerts-notifs', project?.id],
  queryFn: () => api.entities.Notification.filter({ project_id: project?.id }),
  enabled: !!project?.id && open,
 });
 const todayNotifs = projectNotifs.filter(n => (n.created_date || '').slice(0, 10) === todayStr);

 // Recent alert errors (admin only)
 const oneWeekAgoStr = new Date();
 oneWeekAgoStr.setDate(oneWeekAgoStr.getDate() - 7);
 const weekAgo = oneWeekAgoStr.toISOString().slice(0, 10);
 const { data: allErrors = [] } = useQuery({
  queryKey: ['alert-errors-all'],
  queryFn: () => api.entities.ErrorLog.list('-created_date', 200),
  enabled: isAdmin && open,
 });
 const recentErrors = allErrors.filter(e =>
  e.code && ['ALERT_EMAIL_FAILED', 'ALERT_BELL_FAILED'].includes(e.code) &&
  (e.created_date || '').slice(0, 10) >= weekAgo
 );

 // Build recipient list: project members + PM + liaison + "me"
 const recipients = useMemo(() => {
  if (!project) return [];
  const map = new Map();
  if (currentUserEmail) {
   const tm = teamMembers.find(m => m.email?.trim() === currentUserEmail);
   map.set(currentUserEmail, { email: currentUserEmail, label: tm?.name ? `${tm.name} (אני)` : 'אני' });
  }
  const memberEmails = project.member_emails || [];
  for (const email of memberEmails) {
   if (!email || map.has(email)) continue;
   const tm = teamMembers.find(m => m.email?.trim() === email);
   map.set(email, { email, label: tm?.name || email });
  }
  if (project.project_manager) {
   const pmMember = teamMembers.find(m => m.name?.trim() === project.project_manager.trim());
   if (pmMember?.email && !map.has(pmMember.email)) {
    map.set(pmMember.email, { email: pmMember.email, label: `${pmMember.name} (מנהל פרויקט)` });
   }
  }
  if (project.current_liaison) {
   const liaisonMember = teamMembers.find(m => m.name?.trim() === project.current_liaison.trim());
   if (liaisonMember?.email && !map.has(liaisonMember.email)) {
    map.set(liaisonMember.email, { email: liaisonMember.email, label: `${liaisonMember.name} (מלווה)` });
   }
  }
  return [...map.values()];
 }, [project, teamMembers, currentUserEmail]);

 const createMutation = useMutation({
  mutationFn: (data) => api.entities.ProjectAlert.create(data),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey });
   toast.success('ההתראה נוצרה');
   setShowForm(false);
   setEditingAlert(null);
  },
  onError: () => toast.error('שמירת ההתראה נכשלה'),
 });

 const updateMutation = useMutation({
  mutationFn: ({ id, data }) => api.entities.ProjectAlert.update(id, data),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey });
   toast.success('ההתראה עודכנה');
   setShowForm(false);
   setEditingAlert(null);
  },
  onError: () => toast.error('עדכון ההתראה נכשל'),
 });

 const deleteMutation = useMutation({
  mutationFn: (id) => api.entities.ProjectAlert.delete(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  onError: () => toast.error('מחיקת ההתראה נכשלה'),
 });

 const recreateMutation = useMutation({
  mutationFn: (data) => api.entities.ProjectAlert.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  // This one runs behind an "undo" — if it fails, the row someone just
  // restored simply never comes back.
  onError: (e) => toast.error(e?.message || 'שחזור ההתראה נכשל'),
 });

 const toggleActiveMutation = useMutation({
  mutationFn: ({ id, active }) => api.entities.ProjectAlert.update(id, { active }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  onError: () => toast.error('עדכון הסטטוס נכשל'),
 });

 const reactivateMutation = useMutation({
  mutationFn: (id) => api.entities.ProjectAlert.update(id, { active: true, last_sent_key: null }),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey });
   toast.success('ההתראה הופעלה מחדש');
  },
  onError: () => toast.error('הפעלת ההתראה מחדש נכשלה'),
 });

 const runNowMutation = useMutation({
  mutationFn: () => api.functions.invoke('processProjectAlerts', {}),
  onSuccess: (res) => {
   queryClient.invalidateQueries({ queryKey: ['alerts-heartbeat-status'] });
   queryClient.invalidateQueries({ queryKey: ['project-alerts-today', project?.id] });
   const checked = res?.alertsChecked ?? 0;
   const sent = res?.alertsSent ?? 0;
   const errCount = res?.errors?.length ?? 0;
   if (errCount > 0) {
    toast.warning(`נבדקו ${checked} · נשלחו ${sent} · ${errCount} שגיאות`);
   } else {
    toast.success(`נבדקו ${checked} · נשלחו ${sent}`);
   }
  },
  onError: () => toast.error('הרצת הבדיקה נכשלה'),
 });

 const handleSubmit = (formData) => {
  const payload = {
   ...formData,
   project_id: project.id,
   channels: { bell: !!formData.channels?.bell, email: !!formData.channels?.email },
  };
  if (editingAlert) {
   updateMutation.mutate({ id: editingAlert.id, data: payload });
  } else {
   createMutation.mutate(payload);
  }
 };

 const handleDelete = (alert) => {
  const snapshot = { ...alert };
  delete snapshot.id;
  delete snapshot.created_date;
  delete snapshot.updated_date;
  delete snapshot.created_by_id;
  deleteMutation.mutate(alert.id);
  toast(`ההתראה "${describeAlert(alert)}"נמחקה`, {
   action: { label: 'בטל מחיקה', onClick: () => recreateMutation.mutate(snapshot) },
   duration: 5000,
  });
 };

 const handleEdit = (alert) => {
  setEditingAlert(alert);
  setShowForm(true);
 };

 const handleNew = () => {
  setEditingAlert(null);
  setShowForm(true);
 };

 const handleCancelForm = () => {
  setShowForm(false);
  setEditingAlert(null);
 };

 const isSubmitting = createMutation.isPending || updateMutation.isPending;
 const recipientLabel = (email) => recipients.find(r => r.email === email)?.label || email;

 // --- Status row computation ---
 const lastRunStr = heartbeatStatus?.lastRun;
 const lastRunAgoMin = lastRunStr
  ? Math.max(0, Math.round((Date.now() - new Date(lastRunStr).getTime()) / 60000))
  : null;
 const alertsSentToday = heartbeatStatus?.alertsSentToday ?? todayNotifs.length;

 return (
  <Sheet open={open} onOpenChange={onOpenChange}>
   <SheetContent side="left"dir="rtl"className="w-full sm:max-w-lg p-0 flex flex-col">
    <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
     <SheetTitle className="text-right">
      התראות — {project?.client_name || project?.name}
     </SheetTitle>
    </SheetHeader>

    {!showForm && (
     <div className="px-5 py-3 border-b border-border bg-muted/30 space-y-2">
      <div className="flex items-center justify-between gap-2">
       <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
        <Activity className="w-3.5 h-3.5 flex-shrink-0"/>
        <span className="truncate">
         בדיקה אחרונה: {lastRunAgoMin !== null ? `לפני ${lastRunAgoMin} דק׳` : 'מעולם לא רצה'} · {alertsSentToday} התראות נשלחו היום
        </span>
       </div>
       {isAdmin && (
        <Button
         size="sm"
         variant="outline"
         onClick={() => runNowMutation.mutate()}
         disabled={runNowMutation.isPending}
         className="h-7 gap-1.5 text-xs flex-shrink-0"
        >
         <RotateCw className={`w-3 h-3 ${runNowMutation.isPending ? 'animate-spin' : ''}`} />
         הרץ בדיקה עכשיו
        </Button>
       )}
      </div>
      {isAdmin && recentErrors.length > 0 && (
       <div className="flex items-start gap-1.5 text-xs text-warning bg-warning-muted/50 rounded-md px-2 py-1.5">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
        <span className="leading-snug">
         {recentErrors.length} שגיאות עיבוד בשבוע האחרון — בדוק ErrorLog לפרטים
        </span>
       </div>
      )}
     </div>
    )}

    <div className="flex-1 overflow-y-auto px-5 py-4">
     {showForm ? (
      <ProjectAlertForm
       initialData={editingAlert}
       recipients={recipients}
       onSubmit={handleSubmit}
       onCancel={handleCancelForm}
       isSubmitting={isSubmitting}
      />
     ) : isLoading ? (
      <ListSkeleton />
     ) : alerts.length === 0 ? (
      <EmptyState
       icon={Bell}
       title="אין התראות לפרויקט"
       description="צור התראה ראשונה כדי לקבל עדכונים אוטומטיים"
       action={
        <Button onClick={handleNew} className="rounded-full">
         <Plus className="w-4 h-4"/> התראה חדשה
        </Button>
       }
      />
     ) : (
      <div className="space-y-2.5">
       {alerts.map(alert => (
        <ProjectAlertRow
         key={alert.id}
         alert={alert}
         recipientLabel={recipientLabel(alert.recipient_email)}
         onEdit={handleEdit}
         onDelete={handleDelete}
         onToggleActive={(a, v) => toggleActiveMutation.mutate({ id: a.id, active: v })}
         onReactivate={(a) => reactivateMutation.mutate(a.id)}
        />
       ))}
      </div>
     )}
    </div>

    {!showForm && alerts.length > 0 && (
     <SheetFooter className="px-5 py-3 border-t border-border justify-start gap-2">
      <Button onClick={handleNew} className="rounded-full">
       <Plus className="w-4 h-4"/> התראה חדשה
      </Button>
     </SheetFooter>
    )}
   </SheetContent>
  </Sheet>
 );
}
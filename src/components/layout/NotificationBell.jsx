import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, Check, X, ChevronLeft, CheckCheck, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getProjectPathFromId } from '@/lib/projectSlug';
import { formatDate } from '@/lib/formatDate';


export default function NotificationBell({ userEmail }) {
 const navigate = useNavigate();
 const [open, setOpen] = useState(false);
 const [panelPos, setPanelPos] = useState({ top: 0, right: 0, openUp: true });
 const buttonRef = useRef(null);
 const queryClient = useQueryClient();

 const { data: notifications = [] } = useQuery({
  queryKey: ['notifications', userEmail],
  queryFn: () => api.entities.Notification.filter({ recipient_email: userEmail }),
  enabled: !!userEmail,
  refetchInterval: 30000,
 });

 const unread = notifications.filter(n => !n.is_read);

 // Make every notification clickable: mark it read and navigate to the most
 // specific related screen (project, with milestones tab when relevant).
 const handleOpenNotification = (n) => {
  if (!n.is_read) markReadMutation.mutate(n.id);
  setOpen(false);
  if (n.gantt_item_id && n.project_id) {
   navigate(`${getProjectPathFromId(n.project_id, queryClient)}?tab=gantt&itemId=${n.gantt_item_id}`);
  } else if (n.task_id) {
   // Task notifications open the tasks page with that task expanded.
   navigate(`/tasks?task=${n.task_id}`);
  } else if (n.ticket_id) {
   // Support-ticket notifications open the support page with that ticket expanded.
   navigate(`/support?ticket=${n.ticket_id}`);
  } else if (n.form_template_id) {
   // Form recommendation notifications open the forms page.
   navigate(`/forms?form=${n.form_template_id}`);
  } else if (n.project_id) {
   const tab = 'overview';
   navigate(`${getProjectPathFromId(n.project_id, queryClient)}?tab=${tab}`);
  } else {
   // Reminder and other notifications without a project/task/ticket — go to calendar.
   navigate('/calendar');
  }
 };

 const markReadMutation = useMutation({
  mutationFn: (id) => api.entities.Notification.update(id, { is_read: true }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] }),
 });

 const markAllReadMutation = useMutation({
  mutationFn: async () => {
   for (const n of unread) {
    await api.entities.Notification.update(n.id, { is_read: true });
   }
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] }),
 });

 const deleteOneMutation = useMutation({
  mutationFn: (id) => api.entities.Notification.delete(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] }),
 });

 useEffect(() => {
  if (open && buttonRef.current) {
   const rect = buttonRef.current.getBoundingClientRect();
   // Decide whether to open the panel upward or downward based on available space.
   // Near the top of the screen (e.g. mobile top bar) there's no room above, so open downward.
   const spaceAbove = rect.top;
   const openUp = spaceAbove > 420;
   // Keep the panel fully inside the viewport: clamp its right edge so it never
   // gets pushed off-screen / clipped behind the top bar on mobile.
   const panelWidth = Math.min(320, window.innerWidth - 16);
   let rightOffset = Math.max(8, window.innerWidth - rect.right);
   if (rightOffset + panelWidth > window.innerWidth - 8) {
    rightOffset = Math.max(8, window.innerWidth - panelWidth - 8);
   }
   setPanelPos({
    top: openUp ? rect.top - 8 : rect.bottom + 8,
    right: rightOffset,
    openUp,
    width: panelWidth,
   });
  }
 }, [open]);

 useEffect(() => {
  const handler = (e) => {
   if (buttonRef.current && !buttonRef.current.contains(e.target)) {
    const panel = document.getElementById('notification-panel');
    if (panel && !panel.contains(e.target)) setOpen(false);
   }
  };
  if (open) document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
 }, [open]);

 if (!userEmail) return null;

 const panel = open ? createPortal(
  <div
   id="notification-panel"
   className="fixed z-[9999] bg-card rounded-lg border border-border shadow-lg overflow-hidden"
   dir="rtl"
   style={{
    top: panelPos.top,
    right: panelPos.right,
    width: panelPos.width || 320,
    transform: panelPos.openUp ? 'translateY(-100%)' : 'none',
    maxWidth: 'calc(100vw - 16px)',
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
   }}
  >
   {/* Header */}
   <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
     התראות
     {unread.length > 0 && (
      <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-bold">{unread.length}</span>
     )}
    </h3>
    <div className="flex items-center gap-2">
     {unread.length > 0 && (
      <button
       onClick={() => markAllReadMutation.mutate()}
       className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
      >
       <CheckCheck className="w-3.5 h-3.5"/>
       סמן הכל כנקרא
      </button>
     )}
     <button
      onClick={() => setOpen(false)}
      className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
     >
      <X className="w-3.5 h-3.5 text-muted-foreground"/>
     </button>
    </div>
   </div>

   {/* List — unread only */}
   <div className="overflow-y-auto flex-1">
    {unread.length === 0 ? (
     <div className="flex flex-col items-center justify-center py-10 px-4">
      <Bell className="w-8 h-8 text-muted-foreground/30 mb-3"/>
      <p className="text-sm text-muted-foreground font-medium">אין התראות חדשות</p>
      <p className="text-xs text-muted-foreground mt-1">תיוגים ועדכונים יופיעו כאן</p>
     </div>
    ) : (
     unread.slice().reverse().map((n) => (
      <div
       key={n.id}
       className="group w-full flex items-start gap-2 px-4 py-3 border-b border-border/60 last:border-0 transition-colors bg-accent hover:bg-muted"
      >
       <button
        onClick={() => handleOpenNotification(n)}
        className="text-right flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
       >
        {n.type === 'reminder' ? (
         <BellRing className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"/>
        ) : (
         <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-primary" />
        )}
        <p className="text-xs text-foreground flex-1 leading-relaxed">{n.message}</p>
        {(n.project_id || n.ticket_id || n.form_template_id) && (
         <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5"/>
        )}
       </button>
       <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap" dir="ltr">
         {formatDate(n.sent_at || n.created_date, 'datetime-short')}
        </span>
        <div className="flex items-center gap-0.5">
         <button
          onClick={() => markReadMutation.mutate(n.id)}
          className="w-6 h-6 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
          title="סמן כנקרא"
         >
          <Check className="w-3.5 h-3.5 text-primary"/>
         </button>
         <button
          onClick={() => deleteOneMutation.mutate(n.id)}
          className="w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
          title="מחק התראה"
         >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive"/>
         </button>
        </div>
       </div>
      </div>
     ))
    )}
   </div>

   {/* View all notifications button */}
   <button
    onClick={() => { setOpen(false); navigate('/notifications'); }}
    className="flex items-center justify-center gap-1.5 py-2.5 border-t border-border bg-muted/20 text-xs font-semibold text-primary hover:bg-accent transition-colors flex-shrink-0"
   >
    כל ההתראות
    <ChevronLeft className="w-3.5 h-3.5"/>
   </button>
  </div>,
  document.body
 ) : null;

 return (
  <>
   <button
    ref={buttonRef}
    onClick={() => setOpen(!open)}
    className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
    title="התראות"
   >
    <Bell className="w-5 h-5 text-foreground"/>
    {unread.length > 0 && (
     <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-destructive rounded-full text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-white">
      {unread.length > 9 ? '9+' : unread.length}
     </span>
    )}
   </button>
   {panel}
  </>
 );
}
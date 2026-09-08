import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { Plus, Pencil, Trash2, Pin, PinOff, MoreVertical, Loader2, Bell, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '@/hooks/useAccessControl';
import DateField from '@/components/ui/date-field';
import ReminderFields from '@/components/shared/ReminderFields';
import InlineDateCell from '@/components/shared/inline/InlineDateCell';

function sortHighlights(items) {
 return [...items].sort((a, b) => {
  if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1;
  return new Date(a.created_date || 0) - new Date(b.created_date || 0);
 });
}

function HighlightForm({ highlight, projectId, memberEmails, onClose }) {
 const queryClient = useQueryClient();
 const { effectiveUser } = useAccessControl();
 const [form, setForm] = useState({
  category: highlight?.category || 'other',
  title: highlight?.title || '',
  content: highlight?.content || '',
  is_pinned: highlight?.is_pinned || false,
  deadline: highlight?.deadline || '',
  reminder_date: highlight?.reminder_date || '',
  reminder_time: highlight?.reminder_time || '',
  reminder_channel: highlight?.reminder_channel || 'bell',
 });

 const createMutation = useMutation({
  mutationFn: async (data) => {
   const payload = {
    ...data,
    project_id: projectId,
    member_emails: memberEmails || [],
    editor_emails: memberEmails || [],
   };
   if (data.reminder_date) {
    payload.reminder_recipient_email = effectiveUser?.email;
   }
   return api.entities.ClientHighlight.create(payload);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['clientHighlights', projectId] });
   toast.success('מידע נוסף');
   onClose();
  },
 });

 const updateMutation = useMutation({
  mutationFn: async (data) => {
   const payload = { ...data };
   if (data.reminder_date && !highlight.reminder_recipient_email) {
    payload.reminder_recipient_email = effectiveUser?.email;
   }
   return api.entities.ClientHighlight.update(highlight.id, payload);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['clientHighlights', projectId] });
   toast.success('מידע עודכן');
   onClose();
  },
 });

 const handleSubmit = (e) => {
  e.preventDefault();
  if (!form.title.trim()) { toast.error('כותרת חובה'); return; }
  if (highlight) updateMutation.mutate(form);
  else createMutation.mutate(form);
 };

 const busy = createMutation.isPending || updateMutation.isPending;

 return (
  <form onSubmit={handleSubmit} className="space-y-4"dir="rtl">
   <div className="grid grid-cols-3 gap-2">
    <div className="col-span-2 space-y-1.5">
     <Label className="text-xs font-medium text-muted-foreground">כותרת *</Label>
     <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="לדוגמה: חיוב מיוחד ל-3 חודשים ראשונים"className="h-10 rounded-lg"autoFocus />
    </div>
    <div className="space-y-1.5">
     <Label className="text-xs font-medium text-muted-foreground">קטגוריה</Label>
     <Input value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="אופציונלי"className="h-10 rounded-lg"/>
    </div>
   </div>
   <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">פרטים</Label>
    <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} className="rounded-lg resize-none text-sm"placeholder="תיאור מפורט..."/>
   </div>
   {/* Optional deadline */}
   <div className="space-y-1.5 pt-2 border-t border-border">
    <Label className="text-xs font-medium text-muted-foreground">דד-ליין (אופציונלי)</Label>
    <DateField value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} placeholder="בחר תאריך"className="h-9 text-sm"/>
   </div>

   {/* Optional reminder — unified component shared with QuoteForm and MilestoneForm */}
   <ReminderFields
    value={{ reminder_date: form.reminder_date, reminder_time: form.reminder_time, reminder_channel: form.reminder_channel }}
    onChange={patch => setForm(f => ({ ...f, ...patch }))}
   />

   <div className="flex gap-2 pt-2 border-t border-border sticky bottom-0 bg-background pb-1">
    <Button type="submit"disabled={busy} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm shadow-none gap-2 flex-1">
     {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
     {highlight ? 'עדכן' : 'הוסף'}
    </Button>
    <Button type="button"variant="outline"onClick={onClose} className="rounded-full h-9 px-4 text-sm">ביטול</Button>
   </div>
  </form>
 );
}

export default function ClientHighlightsSection({ projectId, memberEmails }) {
 const queryClient = useQueryClient();
 const { effectiveUser, isRealAdmin } = useAccessControl();
 const [dialog, setDialog] = useState({ open: false, highlight: null });
 const [deleteDialog, setDeleteDialog] = useState({ open: false, highlight: null });

 const { data: highlights = [] } = useQuery({
  queryKey: ['clientHighlights', projectId],
  queryFn: () => api.entities.ClientHighlight.filter({ project_id: projectId }),
  enabled: !!projectId,
 });

 const updateMutation = useMutation({
  mutationFn: ({ id, data }) => api.entities.ClientHighlight.update(id, data),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['clientHighlights', projectId] });
  },
 });

 const deleteMutation = useMutation({
  mutationFn: (id) => api.entities.ClientHighlight.delete(id),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['clientHighlights', projectId] });
   setDeleteDialog({ open: false, highlight: null });
   toast.success('מידע נמחק');
  },
 });

 // Permission check: non-member (non-admin) doesn't see the section at all
 const normalizedEmail = (effectiveUser?.email || '').toLowerCase().trim();
 const isMember = (memberEmails || []).some(e => (e || '').toLowerCase().trim() === normalizedEmail);
 if (!isRealAdmin && !isMember) return null;

 const sorted = sortHighlights(highlights);
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const togglePin = (h) => {
  updateMutation.mutate({ id: h.id, data: { is_pinned: !h.is_pinned } });
 };

 return (
  <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
   {/* Header */}
   <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
    <div className="flex items-center gap-2.5">
     <div className="w-8 h-8 rounded-lg bg-warning-muted flex items-center justify-center">
      <Star className="w-4 h-4 text-warning"/>
     </div>
     <h3 className="text-sm font-bold text-foreground">מידע על הלקוח</h3>
    </div>
    <button
     type="button"
     onClick={() => setDialog({ open: true, highlight: null })}
     className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors"
    >
     <Plus className="w-3.5 h-3.5"/> הוסף מידע
    </button>
   </div>

   {/* Body */}
   <div className="p-5">
    {sorted.length === 0 ? (
     <button
      type="button"
      onClick={() => setDialog({ open: true, highlight: null })}
      className="w-full min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-lg hover:bg-accent/50 transition-colors"
     >
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
       <Star className="w-5 h-5 text-muted-foreground/50"/>
      </div>
      <p className="text-sm text-muted-foreground">אין מידע מתועד</p>
      <span className="text-xs text-primary">+ הוסף מידע ראשון</span>
     </button>
    ) : (
     <div className="relative pe-4">
      <div className="absolute top-2 bottom-2 right-[5px] w-0.5 bg-border"/>
      <div className="space-y-3">
       {sorted.map((h) => {
        const dotClass = 'bg-primary border-primary';
        const deadline = h.deadline ? new Date(h.deadline) : null;
        const validDeadline = deadline && !isNaN(deadline.getTime());
        const isOverdue = validDeadline && deadline < today;
        const hasReminder = h.reminder_date && h.reminder_channel;
        return (
         <div key={h.id} className="group relative flex items-start gap-3">
          <span className={`relative z-10 w-3 h-3 mt-1.5 rounded-full border-2 flex-shrink-0 ring-4 ring-card ${dotClass}`} />
          <div
           onClick={() => setDialog({ open: true, highlight: h })}
           className="flex-1 text-right bg-muted/30 hover:bg-muted/50 rounded-lg p-3 transition-colors cursor-pointer min-w-0"
          >
           <p className="text-sm font-semibold text-foreground leading-snug flex items-center gap-1.5">
            {h.is_pinned && <Pin className="w-3 h-3 text-primary inline flex-shrink-0"/>}
            <span className="truncate">{h.title}</span>
           </p>
           <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {h.category && (
             <span className="inline-flex items-center text-[11px] font-medium text-muted-foreground bg-background rounded-full px-2 py-0.5">
              {h.category}
             </span>
            )}
            <span className="inline-flex items-center" onClick={e => e.stopPropagation()}>
              <InlineDateCell value={h.deadline || ''} onChange={deadline => updateMutation.mutate({ id: h.id, data: { deadline } })} />
            </span>
            {hasReminder && (
             <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Bell className="w-3 h-3"/>
              {h.reminder_time || ''}
             </span>
            )}
           </div>
           {h.content && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 line-clamp-2">{h.content}</p>
           )}
          </div>
          <DropdownMenu>
           <DropdownMenuTrigger asChild>
            <button
             type="button"
             className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors shrink-0"
             aria-label="פעולות מידע"
            >
             <MoreVertical className="w-3.5 h-3.5"/>
            </button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="start"className="w-40"dir="rtl">
            <DropdownMenuItem
             onSelect={() => togglePin(h)}
             className="flex items-center gap-2 cursor-pointer text-xs"
            >
             {h.is_pinned ? <PinOff className="w-3.5 h-3.5"/> : <Pin className="w-3.5 h-3.5"/>}
             {h.is_pinned ? 'בטל הצמדה' : 'הצמד'}
            </DropdownMenuItem>
            <DropdownMenuItem
             onSelect={() => setDialog({ open: true, highlight: h })}
             className="flex items-center gap-2 cursor-pointer text-xs"
            >
             <Pencil className="w-3.5 h-3.5"/> עריכה
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
             onSelect={() => setDeleteDialog({ open: true, highlight: h })}
             className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
            >
             <Trash2 className="w-3.5 h-3.5"/> מחיקה
            </DropdownMenuItem>
           </DropdownMenuContent>
          </DropdownMenu>
         </div>
        );
       })}
      </div>
     </div>
    )}
   </div>

   <Sheet open={dialog.open} onOpenChange={open => !open && setDialog({ open: false, highlight: null })}>
    <SheetContent side="left"dir="rtl"className="w-full sm:max-w-md p-0 flex flex-col">
     <SheetHeader className="px-5 py-3.5 border-b border-border text-right shrink-0">
      <SheetTitle className="text-base font-bold">
       {dialog.highlight ? 'עריכת מידע' : 'מידע חדש'}
      </SheetTitle>
     </SheetHeader>
     <div className="flex-1 overflow-y-auto px-5 py-4">
      <HighlightForm highlight={dialog.highlight} projectId={projectId} memberEmails={memberEmails} onClose={() => setDialog({ open: false, highlight: null })} />
     </div>
    </SheetContent>
   </Sheet>

   <DeleteDialog
    open={deleteDialog.open}
    onOpenChange={open => !open && setDeleteDialog({ open: false, highlight: null })}
    onConfirm={() => deleteMutation.mutate(deleteDialog.highlight?.id)}
    title="מחיקת מידע"
    itemName={deleteDialog.highlight?.title}
   />
  </div>
 );
}
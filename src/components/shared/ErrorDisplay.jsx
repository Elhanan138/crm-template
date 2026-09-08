import React, { useState } from 'react';
import { AlertOctagon, Copy, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getErrorInfo } from '@/lib/errors';
import { buildErrorReport, copyToClipboardWithFallback } from '@/lib/errorReport';
import { api } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAccessControl } from '@/hooks/useAccessControl';

/**
 * Standardized error block shown whenever an operation or page section fails.
 * Two actions:
 * - "העתק קוד שגיאה"— copies a structured error string to clipboard (with execCommand fallback).
 * - "שלח כפנייה"— opens a Dialog pre-filled with the error context, creates a SupportTicket
 *  linked to the ErrorLog record.
 */
export default function ErrorDisplay({ code = 'ERR_UNKNOWN_500', context = {}, compact = false }) {
 const info = getErrorInfo(code);
 const [copied, setCopied] = useState(false);
 const [ticketOpen, setTicketOpen] = useState(false);
 const [ticketForm, setTicketForm] = useState({ title: '', description: '' });
 const [submitting, setSubmitting] = useState(false);
 const queryClient = useQueryClient();
 const { effectiveUser } = useAccessControl();

 const report = buildErrorReport({ code, context });

 const handleCopyCode = async () => {
  const ok = await copyToClipboardWithFallback(report.clipboardText);
  if (ok) {
   setCopied(true);
   toast.success('קוד השגיאה הועתק ללוח');
   setTimeout(() => setCopied(false), 2000);
  } else {
   toast.error('לא ניתן היה להעתיק');
  }
 };

 const handleOpenTicket = () => {
  setTicketForm({ title: report.ticketTitle, description: report.ticketDescription });
  setTicketOpen(true);
 };

 const handleSubmitTicket = async () => {
  if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
   toast.error('כותרת ותיאור חובה');
   return;
  }
  setSubmitting(true);
  try {
   const ticket = await api.entities.SupportTicket.create({
    type: 'bug',
    title: ticketForm.title,
    description: ticketForm.description,
    submitted_by: effectiveUser?.full_name || effectiveUser?.email || '',
    submitted_by_email: effectiveUser?.email || '',
    status: 'open',
    priority: 'medium',
    error_log_id: context.errorLogId || '',
   });
   queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
   queryClient.invalidateQueries({ queryKey: ['myTickets'] });
   setTicketOpen(false);
   toast.success('הפנייה נשלחה בהצלחה', {
    description: `מספר פנייה: ${ticket.id}`,
    action: { label: 'צפייה', onClick: () => { window.location.href = `/support?ticket=${ticket.id}`; } },
   });
  } catch {
   toast.error('שליחת הפנייה נכשלה — העתק את הפרטים ושלח בדוא"ל');
  }
  setSubmitting(false);
 };

 return (
  <div
   dir="rtl"
   className={`rounded-lg border border-destructive/30 bg-destructive/5 ${compact ? 'p-3' : 'p-5'}`}
  >
   <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
     <AlertOctagon className="w-4 h-4 text-destructive"/>
    </div>
    <div className="flex-1 min-w-0">
     <div className="flex items-center gap-2 flex-wrap">
      <h4 className="text-sm font-bold text-foreground">{info.title}</h4>
      <code dir="ltr"className="text-[10px] font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{code}</code>
     </div>
     <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{info.message}</p>
     <p className="text-xs text-foreground/80 mt-1">{info.next}</p>

     <div className="flex items-center gap-2 flex-wrap mt-3">
      <Button
       onClick={handleCopyCode}
       variant="outline"
       size="sm"
       className="h-8 rounded-full text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
      >
       {copied ? <Check className="w-3.5 h-3.5"/> : <Copy className="w-3.5 h-3.5"/>}
       {copied ? 'הועתק' : 'העתק קוד שגיאה'}
      </Button>
      <Button
       onClick={handleOpenTicket}
       variant="outline"
       size="sm"
       className="h-8 rounded-full text-xs gap-1.5 border-primary/30 text-primary hover:bg-accent"
      >
       <Send className="w-3.5 h-3.5"/>
       שלח כפנייה
      </Button>
     </div>
    </div>
   </div>

   {/* Ticket Dialog */}
   <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
    <DialogContent className="rounded-lg"dir="rtl">
     <DialogHeader>
      <DialogTitle className="text-right">פנייה חדשה — שגיאה {code}</DialogTitle>
     </DialogHeader>
     <div className="space-y-3">
      <Input
       value={ticketForm.title}
       onChange={e => setTicketForm(f => ({ ...f, title: e.target.value }))}
       placeholder="כותרת הפנייה"
       maxLength={120}
      />
      <Textarea
       value={ticketForm.description}
       onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))}
       rows={8}
       placeholder="תיאור מפורט"
       className="resize-none text-sm"
      />
     </div>
     <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
      <Button onClick={handleSubmitTicket} disabled={submitting} className="rounded-full gap-1.5">
       {submitting ? <Check className="w-4 h-4"/> : <Send className="w-4 h-4"/>}
       שליחת פנייה
      </Button>
      <Button variant="outline"onClick={() => setTicketOpen(false)} className="rounded-full">ביטול</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
}
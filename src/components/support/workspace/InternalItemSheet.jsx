import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Field from '@/components/shared/Field';
import { TYPE_CONFIG } from '../supportConfig';
import { useAccessControl } from '@/hooks/useAccessControl';

const EMPTY = { title: '', type: 'improvement', priority: 'medium', description: '', project_id: '' };

// Admin-initiated dev item — saved as an internal SupportTicket, lives in the same queue.
export default function InternalItemSheet({ open, onOpenChange, user, projects = [] }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();
  const { effectiveUser } = useAccessControl();

  useEffect(() => { if (open) setForm(EMPTY); }, [open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.SupportTicket.create({
      title: data.title,
      type: data.type,
      priority: data.priority,
      description: data.description,
      project_id: data.project_id || '',
      internal: true,
      status: 'open',
      submitted_by: effectiveUser?.full_name || '',
      submitted_by_email: effectiveUser?.email || '',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      toast.success('פריט הפיתוח נוצר', { duration: 2500 });
      onOpenChange(false);
    },
    onError: (e) => toast.error('היצירה נכשלה: ' + e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('כותרת ותיאור הם שדות חובה');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto p-5">
        <SheetHeader className="text-start">
          <SheetTitle>פריט פיתוח חדש</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label="כותרת" htmlFor="ii-title" required>
            <Input id="ii-title" value={form.title} onChange={e => set('title', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="סוג" htmlFor="ii-type">
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger id="ii-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="עדיפות" htmlFor="ii-priority">
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger id="ii-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="medium">בינונית</SelectItem>
                  <SelectItem value="low">נמוכה</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="תיאור" htmlFor="ii-desc" required>
            <Textarea id="ii-desc" rows={4} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
          <Field label="שיוך פרויקט" htmlFor="ii-project" help="אופציונלי">
            <Select value={form.project_id || 'none'} onValueChange={v => set('project_id', v === 'none' ? '' : v)}>
              <SelectTrigger id="ii-project"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא שיוך</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              יצירה
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
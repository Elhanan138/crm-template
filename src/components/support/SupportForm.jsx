import React, { useState } from 'react';
import { useEntityCustomFields } from '@/lib/useCustomFields';
import { useFormLayout } from '@/lib/useFormLayout';
import SupportFormFields from '@/components/support/SupportFormFields';
import { validateCustomFields } from '@/lib/customFields';
import { api } from '@/api/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, MessageSquare, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TYPE_CONFIG } from './supportConfig';
import Field from '@/components/shared/Field';
import { cleanEmail } from '@/lib/permissions';
import { useAccessControl } from '@/hooks/useAccessControl';

export default function SupportForm({ user, compact = false, onSuccess }) {
  const queryClient = useQueryClient();
  const { effectiveUser } = useAccessControl();
  const [submitted, setSubmitted] = useState(false);
  const customFields = useEntityCustomFields('SupportTicket');
  const [form, setForm] = useState({ type: 'improvement', title: '', description: '', image_urls: [], priority: 'medium', project_id: '', custom_fields: {} });
  const [uploading, setUploading] = useState(false);

  // If navigated here from an ErrorDisplay "שלח כפנייה" button, pre-fill the
  // title + description with the error report.
  React.useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pending_error_report');
      const pendingTitle = sessionStorage.getItem('pending_error_title');
      if (pending) {
        setForm(f => ({
          ...f,
          description: f.description ? `${f.description}\n\n${pending}` : pending,
          type: 'bug',
          title: pendingTitle || f.title,
        }));
        sessionStorage.removeItem('pending_error_report');
        sessionStorage.removeItem('pending_error_title');
      }
    } catch { /* ignore */ }
  }, []);

  // Resolve the effective user's full name from the matching TeamMember record.
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date'),
  });
  const effectiveEmail = effectiveUser?.email || user?.email || '';
  const ownMember = teamMembers.find(m => cleanEmail(m.email) === cleanEmail(effectiveEmail));
  // Name comes ONLY from TeamMember records — never fall back to email prefix
  const displayName = ownMember?.name || effectiveUser?.full_name || '';

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), file_url] }));
      }
    } catch {
      toast.error('העלאת התמונה נכשלה');
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (idx) => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, i) => i !== idx) }));

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();
    setUploading(true);
    try {
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), file_url] }));
      }
      toast.success('צילום מסך הודבק', { duration: 2000 });
    } catch {
      toast.error('העלאת צילום המסך נכשלה');
    }
    setUploading(false);
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.SupportTicket.create({
      type: data.type,
      title: data.title,
      description: data.description,
      image_urls: data.image_urls,
      submitted_by: displayName,
      submitted_by_email: effectiveEmail,
      status: 'open',
      priority: data.priority || 'medium',
    }),
    onSuccess: async (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      // Fire-and-forget notification — never blocks the ticket flow
      if (ticket?.id) {
        api.functions.invoke('notifySupportTicket', { ticket_id: ticket.id }).catch(() => {});
      }
      setForm({ type: 'improvement', title: '', description: '', image_urls: [], priority: 'medium', project_id: '' });
      setSubmitted(true);
      toast.success('הפנייה נשלחה בהצלחה!', { duration: 2500 });
      if (onSuccess) onSuccess(ticket);
    },
    onError: () => toast.error('שליחת הפנייה נכשלה, נסה שוב'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) { toast.error('כותרת ותיאור חובה'); return; }
    // Block submission if no TeamMember name found — never submit with email prefix
    if (!displayName.trim()) {
      toast.error('לא נמצא שם משתמש ברשימת הצוות. פנה למנהל המערכת להוספתך לרשימה.');
      return;
    }
    const missing = validateCustomFields(customFields, form.custom_fields || {});
    if (missing.length) { toast.error(`שדות חובה חסרים: ${missing.join(', ')}`); return; }
    createMutation.mutate(form);
  };

  const layout = useFormLayout('SupportTicket', customFields);


  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-card-title">פנייה חדשה</h2>
            <p className="text-caption mt-0.5">דיווח על תקלה, רעיון לשיפור או בקשה — נשמח לשמוע</p>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-success-muted flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-section-title mb-1">הפנייה התקבלה!</h3>
          <p className="text-sm text-muted-foreground mb-6">תודה על המשוב. נטפל בפנייה שלך בהקדם.</p>
          <Button type="button" onClick={() => setSubmitted(false)} variant="outline" className="rounded-full px-6">
            שליחת פנייה נוספת
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Type — card selector */}
          <Field label="מה תרצה לדווח?">
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(TYPE_CONFIG).map(([k, v]) => {
                const Icon = v.icon;
                const active = form.type === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setForm(f => ({ ...f, type: k }))}
                    className={`relative flex items-center gap-2.5 px-3 py-3 rounded-lg border text-sm font-medium text-start transition-all ${
                      active
                        ? `${v.bg} ${v.border} ${v.color} shadow-sm`
                        : 'bg-card border-border text-muted-foreground hover:border-ring/40 hover:bg-muted/30'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-card/70' : 'bg-muted'}`}>
                      <Icon className={`w-4 h-4 ${active ? v.color : 'text-muted-foreground'}`} />
                    </span>
                    <span className="truncate">{v.label}</span>
                    {active && (
                      <span className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* The same renderer the layout preview uses. */}
          <SupportFormFields
            form={form}
            setForm={setForm}
            layout={layout}
            customFields={customFields}
            compact={compact}
            uploading={uploading}
            handlePaste={handlePaste}
            handleImageUpload={handleImageUpload}
            removeImage={removeImage}
          />


          <Button
            type="submit"
            disabled={createMutation.isPending || uploading}
            className="w-full h-11 rounded-lg text-sm font-semibold gap-2"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            שליחת פנייה
          </Button>
        </form>
      )}
    </div>
  );
}
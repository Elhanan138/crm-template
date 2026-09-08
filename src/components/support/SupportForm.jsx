import React, { useState } from 'react';
import EntityCustomFields, { useEntityCustomFields } from '@/components/shared/EntityCustomFields';
import { validateCustomFields } from '@/lib/customFields';
import { api } from '@/api/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, MessageSquare, ImagePlus, X, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TYPE_CONFIG } from './supportConfig';
import Field from '@/components/shared/Field';
import { cleanEmail } from '@/lib/permissions';
import { useAccessControl } from '@/hooks/useAccessControl';

const URGENCY = [
  { key: 'low', label: 'נמוכה', dot: 'bg-muted-foreground' },
  { key: 'medium', label: 'בינונית', dot: 'bg-warning' },
  { key: 'high', label: 'גבוהה / חוסם', dot: 'bg-destructive' },
];

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

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden" dir="rtl">
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

          {/* Urgency — segmented control */}
          <Field label="דחיפות">
            <div className="grid grid-cols-3 gap-0 rounded-lg border border-input overflow-hidden" role="radiogroup" aria-label="דחיפות">
              {URGENCY.map((u, i) => {
                const active = form.priority === u.key;
                return (
                  <button
                    key={u.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm(f => ({ ...f, priority: u.key }))}
                    className={`flex items-center justify-center gap-1.5 h-10 px-2 text-xs sm:text-sm font-medium transition-colors ${
                      i > 0 ? 'border-s border-input' : ''
                    } ${active ? 'bg-accent text-accent-foreground font-semibold' : 'bg-card text-muted-foreground hover:bg-muted/40'}`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.dot}`} />
                    <span className="truncate">{u.label}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Title */}
          <Field label="כותרת" htmlFor="sf-title" required>
            <Input
              id="sf-title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="תאר בקצרה את הנושא..."
              maxLength={120}
              className="h-10"
            />
          </Field>

          {/* Description */}
          <Field label="תיאור מפורט" htmlFor="sf-desc" required>
            <div className="relative">
              <Textarea
                id="sf-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                onPaste={handlePaste}
                rows={compact ? 4 : 6}
                placeholder="פרט כמה שיותר — מה קורה, מה ציפית שיקרה, וצעדים לשחזור... (ניתן להדביק צילומי מסך ישירות)"
                className="resize-none text-sm pb-6"
              />
              <span className="absolute bottom-2 start-3 text-[11px] text-muted-foreground pointer-events-none">
                {form.description.length} תווים
              </span>
            </div>
          </Field>

          {/* Attachments — dropzone-style */}
          <Field label="צילומי מסך" help="אופציונלי — תמונה שווה אלף מילים">
            <label className={`flex flex-col items-center justify-center gap-1.5 py-5 px-4 rounded-lg border border-dashed cursor-pointer transition-all ${
              uploading ? 'border-input bg-muted/40 cursor-wait' : 'border-input bg-muted/20 hover:border-ring/50 hover:bg-accent/30'
            }`}>
              {uploading
                ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
              <span className="text-xs font-medium text-muted-foreground">
                {uploading ? 'מעלה...' : 'לחץ לצירוף צילומי מסך'}
              </span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
            {(form.image_urls || []).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.image_urls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border group">
                    <img src={url} alt={`צרופה ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label="הסרת תמונה"
                      className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full bg-foreground/60 text-background flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <EntityCustomFields
            entity="SupportTicket"
            values={form.custom_fields}
            onChange={v => setForm(f => ({ ...f, custom_fields: v }))}
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
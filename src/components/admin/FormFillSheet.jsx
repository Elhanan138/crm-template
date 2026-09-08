import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowRight, Save, CheckCircle2, Loader2, FileText, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { generateSubmissionPdfBlob, uploadSubmissionPdf, attachSubmissionToProject } from '@/lib/submissionPdf';
import { formatDate } from '@/lib/formatDate';
import FormPreview from './FormPreview';
import FormSubmissionPdf from './FormSubmissionPdf';

/**
 * Full-page form fill with draft auto-save + project association.
 * - Renders as a full page (not a sheet) for comfortable filling
 * - "שמור טיוטה"saves with status=draft and closes
 * - "סיים ושמור"validates, saves with status=completed, generates PDF and attaches to project if project_id set
 * - 30s silent auto-save while open (no toast, just "נשמר"indicator)
 * - When existingSubmission is provided, pre-populates from it (continue draft or edit completed)
 */
export default function FormFillSheet({ open, onOpenChange, form, existingSubmission = null, onSaved }) {
 const [values, setValues] = useState({});
 const [submitterEmail, setSubmitterEmail] = useState('');
 const [projectId, setProjectId] = useState('');
 const [submissionId, setSubmissionId] = useState(null);
 const [saving, setSaving] = useState(false);
 const [savedAt, setSavedAt] = useState(null);
 const pdfRef = useRef(null);

 const { data: projects = [] } = useQuery({
  queryKey: ['projectsForForms'],
  queryFn: () => api.entities.Project.list('name'),
  enabled: open,
 });

 const { data: teamMembers = [] } = useQuery({
  queryKey: ['teamMembers'],
  queryFn: () => api.entities.TeamMember.list('name'),
  enabled: open,
 });

 // Default to current logged-in user
 useEffect(() => {
  if (!open) return;
  api.auth.me().then(u => {
   if (u?.email) setSubmitterEmail(u.email.toLowerCase());
  }).catch(() => {});
 }, [open]);

 // Reset / populate when opened
 useEffect(() => {
  if (open) {
   if (existingSubmission) {
    setValues(existingSubmission.answers || {});
    setSubmitterEmail(existingSubmission.submitted_by_email || '');
    setProjectId(existingSubmission.project_id || '');
    setSubmissionId(existingSubmission.id);
   } else {
    setValues({});
    setProjectId('');
    setSubmissionId(null);
   }
   setSavedAt(null);
   setSaving(false);
  }
 }, [open, existingSubmission]);

 const handleChange = (id, v) => setValues(prev => ({ ...prev, [id]: v }));

 const validate = () => {
  const missing = (form?.fields || []).filter(f => {
   if (!f.required) return false;
   const v = values[f.id];
   if (Array.isArray(v)) return v.length === 0;
   return v === undefined || v === '' || v === false;
  });
  if (missing.length > 0) {
   toast.error(`חסרים שדות חובה: ${missing.map(f => f.label || 'שדה').join(', ')}`);
   return false;
  }
  return true;
 };

 const submitter = teamMembers.find(m => m.email?.toLowerCase() === submitterEmail);
 const buildPayload = (status) => ({
  template_id: form.id,
  template_title: form.title,
  fields_snapshot: (form.fields || []).map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options || [] })),
  answers: values,
  project_id: projectId || undefined,
  submitted_by_email: submitterEmail || undefined,
  submitted_by_name: submitter?.name || undefined,
  status,
 });

 const buildPdfSubmission = () => ({
  id: submissionId,
  template_title: form?.title || '',
  submitted_by_name: submitter?.name || submitterEmail || '',
  created_date: existingSubmission?.created_date || new Date().toISOString(),
  fields_snapshot: (form?.fields || []).map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options || [] })),
  answers: values,
 });

 const saveDraft = async (silent = false) => {
  if (!form?.id) return;
  if (!silent) setSaving(true);
  try {
   const payload = buildPayload('draft');
   if (submissionId) {
    await api.entities.FormSubmission.update(submissionId, payload);
   } else {
    const created = await api.entities.FormSubmission.create(payload);
    setSubmissionId(created.id);
   }
   setSavedAt(new Date());
   if (!silent) {
    toast.success('הטיוטה נשמרה');
    onSaved?.();
    onOpenChange(false);
   }
  } catch {
   if (!silent) toast.error('שמירת הטיוטה נכשלה');
  } finally {
   if (!silent) setSaving(false);
  }
 };

 const complete = async () => {
  if (!validate()) return;
  if (!submitterEmail) { toast.error('יש לבחור ממלא טופס מהמערכת'); return; }
  setSaving(true);
  try {
   const payload = buildPayload('completed');
   let saved;
   if (submissionId) {
    await api.entities.FormSubmission.update(submissionId, payload);
    saved = { ...payload, id: submissionId, created_date: existingSubmission?.created_date || new Date().toISOString() };
   } else {
    saved = await api.entities.FormSubmission.create(payload);
    setSubmissionId(saved.id);
   }

   // Project association: generate PDF, upload, attach to project docs
   if (projectId) {
    try {
     await new Promise(r => setTimeout(r, 100));
     const pdfBlob = await generateSubmissionPdfBlob(pdfRef.current);
     const fileName = `טופס: ${form.title} — ${formatDate(saved.created_date || new Date(), 'short')}`;
     const pdfUrl = await uploadSubmissionPdf(pdfBlob, fileName);
     await attachSubmissionToProject(projectId, saved, pdfUrl);
     toast.success('הטופס הושלם וצורף לפרויקט');
    } catch {
     toast.error('הטופס נשמר אך שיוך ה-PDF לפרויקט נכשל');
    }
   } else {
    toast.success('הטופס הושלם ונשמר');
   }

   onSaved?.();
   onOpenChange(false);
  } catch {
   toast.error('שמירת הטופס נכשלה');
  } finally {
   setSaving(false);
  }
 };

 // 30s silent auto-save — uses refs to avoid stale closures
 const stateRef = useRef({});
 stateRef.current = { values, submitterEmail, projectId, submissionId };

 const silentSaveRef = useRef(async () => {});
 silentSaveRef.current = async () => {
  const { values: v, submitterEmail: se, projectId: pid, submissionId: sid } = stateRef.current;
  if (!form?.id) return;
  if (Object.keys(v).length === 0 && !sid) return;
  try {
   const sm = teamMembers.find(m => m.email?.toLowerCase() === se);
   const payload = {
    template_id: form.id,
    template_title: form.title,
    fields_snapshot: (form.fields || []).map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options || [] })),
    answers: v,
    project_id: pid || undefined,
    submitted_by_email: se || undefined,
    submitted_by_name: sm?.name || undefined,
    status: 'draft',
   };
   if (sid) {
    await api.entities.FormSubmission.update(sid, payload);
   } else {
    const created = await api.entities.FormSubmission.create(payload);
    setSubmissionId(created.id);
   }
   setSavedAt(new Date());
  } catch { /* silent */ }
 };

 useEffect(() => {
  if (!open) return;
  const interval = setInterval(() => silentSaveRef.current(), 30000);
  return () => clearInterval(interval);
 }, [open]);

 if (!open || !form) return null;

 return (
  <div dir="rtl"className="min-h-[calc(100dvh-8rem)] flex flex-col">
   {/* Top bar — back button at top of screen, system-wide pattern */}
   <div className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-background/90 backdrop-blur-sm border-b border-border">
    <button
     onClick={() => onOpenChange(false)}
     className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
    >
     <ArrowRight className="w-4 h-4"/> חזרה
    </button>
   </div>

   {/* Header */}
   <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex-shrink-0">
    <div className="h-1 bg-gradient-to-l from-primary/60 to-primary/20"/>
    <div className="p-4 sm:p-5">
     <div className="flex items-center gap-3 min-w-0">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
       <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-primary"/>
       </div>
       <div className="min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{form.title}</h1>
        <p className="text-caption">
         {existingSubmission?.status === 'draft' ? 'המשך מילוי טיוטה' : existingSubmission ? 'עריכת מילוי' : 'מילוי טופס'}
         {savedAt && <span className="text-success me-2">· נשמר אוטומטית</span>}
        </p>
       </div>
      </div>
      {savedAt && (
       <span className="hidden sm:flex items-center gap-1 text-xs text-success flex-shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5"/> נשמר {formatDate(savedAt, 'time')}
       </span>
      )}
     </div>
    </div>
   </div>

   {/* Form content */}
   <div className="flex-1 py-4 space-y-4">
    {/* Submitter + Project association */}
    <div className="bg-card rounded-lg border border-border shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
     <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">ממלא הטופס</Label>
      <Select value={submitterEmail} onValueChange={setSubmitterEmail}>
       <SelectTrigger className="h-9 rounded-md text-sm"><SelectValue placeholder="בחר משתמש"/></SelectTrigger>
       <SelectContent dir="rtl">
        {teamMembers.map(m => <SelectItem key={m.id} value={m.email?.toLowerCase()}>{m.name}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>
     <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">שיוך לפרויקט (אופציונלי)</Label>
      <Select value={projectId} onValueChange={setProjectId}>
       <SelectTrigger className="h-9 rounded-md text-sm"><SelectValue placeholder="ללא פרויקט"/></SelectTrigger>
       <SelectContent dir="rtl">
        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>
    </div>

    {/* The actual form */}
    <FormPreview
     title={form.title || ''}
     description={form.description || ''}
     fields={form.fields || []}
     fillable
     values={values}
     onChange={handleChange}
    />
   </div>

   {/* Sticky action bar */}
   <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border flex items-center gap-2">
    <Button
     onClick={complete}
     disabled={saving}
     className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11 px-6 text-sm font-semibold gap-2 flex-1 sm:flex-initial"
    >
     {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
     סיים ושמור
    </Button>
    <Button
     variant="outline"
     onClick={() => saveDraft(false)}
     disabled={saving}
     className="rounded-lg h-11 px-5 text-sm gap-2"
    >
     {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
     שמור טיוטה
    </Button>
    <Button
     variant="ghost"
     onClick={() => onOpenChange(false)}
     className="rounded-lg h-11 px-4 text-sm gap-2 sm:ml-auto"
    >
     <X className="w-4 h-4"/>
     ביטול
    </Button>
   </div>

   {/* Hidden PDF layout — always rendered for export/association */}
   <FormSubmissionPdf ref={pdfRef} submission={buildPdfSubmission()} />
  </div>
 );
}
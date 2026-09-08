import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Save, FileText, CalendarDays, ImagePlus, X, LayoutDashboard, Route, GanttChart, FileSignature, CheckSquare, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useSelectablePeople } from '@/hooks/useSelectablePeople';
import AccessDenied from '@/components/layout/AccessDenied';
import BackButton from '@/components/shared/BackButton';
import CustomFieldsSection from '@/components/project/CustomFieldsSection';
import { getProjectPath, getProjectEditPath, isObjectId } from '@/lib/projectSlug';

const PROJECT_TABS = [
 { id: 'overview', label: 'ניהול פרויקט', icon: LayoutDashboard },
 { id: 'project-life', label: 'חיי פרויקט', icon: Route },
 { id: 'gantt', label: 'גאנט', icon: GanttChart },
 { id: 'finance', label: 'הצעות ותעריפים', icon: FileSignature },
 { id: 'tasks', label: 'משימות', icon: CheckSquare },
 { id: 'meetings', label: 'פגישות והדרכות', icon: CalendarDays },
 ];

export default function EditProject() {
 const { slug: slugOrId } = useParams();
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const { hasProject, isRealAdmin, isLoading: loadingAccess } = useAccessControl();
 const looksLikeId = isObjectId(slugOrId);

 const { data: globalTabRes } = useQuery({
  queryKey: ['global-tab-visibility'],
  queryFn: () => api.functions.invoke('globalTabVisibility', {}),
 });
 const globalTabVisibility = globalTabRes?.data?.value || {};

 const { data: project, isLoading } = useQuery({
  queryKey: ['project', slugOrId],
  queryFn: async () => {
   if (looksLikeId) {
    return await api.entities.Project.get(slugOrId);
   }
   const results = await api.entities.Project.filter({ slug: slugOrId });
   if (results && results.length > 0) return results[0];
   try { return await api.entities.Project.get(slugOrId); } catch { return null; }
  },
  enabled: !!slugOrId,
 });

 useEffect(() => {
  if (project && project.slug && looksLikeId) {
   navigate(`${getProjectEditPath(project)}${window.location.search}`, { replace: true });
  }
 }, [project, looksLikeId, navigate]);

 const projectId = project?.id || slugOrId;

 const people = useSelectablePeople();
 const [form, setForm] = useState(null);
 const [uploading, setUploading] = useState(false);
 const lastSyncedRef = useRef(null);

 const originalFormRef = useRef(null);

 useEffect(() => {
  const syncKey = project ? `${project.id}:${project.updated_date || ''}` : null;
  if (project && (!form || lastSyncedRef.current !== syncKey)) {
   const newForm = {
    client_name: project.client_name || '',
    image_url: project.image_url || '',
    contract_value: project.contract_value || '',
    project_manager: project.project_manager || '',
    current_liaison: project.current_liaison || '',
    external_consultants: project.external_consultants || '',
    pilot_date: project.pilot_date || '',
    licensing_start_date: project.licensing_start_date || null,
    kickoff_date: project.kickoff_date || null,
    go_live_date: project.go_live_date || null,
    go_live_notes: project.go_live_notes || '',
    frozen_until: project.frozen_until || null,
    frozen_notes: project.frozen_notes || '',
    licensing_reminder_date: project.licensing_reminder_date || null,
    document_url: project.document_url || null,
    licensing_duration: project.licensing_duration || '',
    licensing_duration_unit: project.licensing_duration_unit || 'months',
    hidden_tabs: project.hidden_tabs || [],
    team_members: project.team_members || [],
    client_highlights: [],
   };
   setForm(newForm);
   originalFormRef.current = newForm;
   lastSyncedRef.current = syncKey;
  }
 }, [project]);

 const hasChanges = useMemo(() => {
  if (!form || !originalFormRef.current) return false;
  return JSON.stringify(form) !== JSON.stringify(originalFormRef.current);
 }, [form]);

 const handleBeforeBack = () => {
  if (hasChanges && !window.confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) {
   return false;
  }
 };

 useEffect(() => {
  const handler = (e) => {
   if (hasChanges) {
    e.preventDefault();
    e.returnValue = '';
   }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
 }, [hasChanges]);

 const updateMutation = useMutation({
  mutationFn: async (data) => {
   const { client_highlights, ...projectData } = data;
   try {
    await api.functions.invoke('syncPermissions', { projectId });
   } catch (e) { /* non-critical */ }
   const updated = await api.entities.Project.update(projectId, projectData);
   // Create new client highlights (additive)
   const validHighlights = (client_highlights || []).filter(h => h.title?.trim());
   if (validHighlights.length > 0) {
    await api.entities.ClientHighlight.bulkCreate(
     validHighlights.map((h, i) => ({
      project_id: projectId,
      category: h.category || 'other',
      title: h.title.trim(),
      content: h.content || '',
      is_pinned: h.is_pinned || false,
      order: i,
      member_emails: project.member_emails || [],
      editor_emails: project.member_emails || [],
     }))
    );
   }
   try {
    await api.functions.invoke('syncPermissions', { projectId });
   } catch (e) { /* non-critical */ }
   return updated;
  },
  onSuccess: (updated) => {
   queryClient.invalidateQueries({ queryKey: ['project', projectId] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   queryClient.invalidateQueries({ queryKey: ['projectsCreatorMeta'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
   toast.success('הפרויקט עודכן בהצלחה');
   navigate(getProjectPath(updated || project));
  },
 });

 const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

 const addClientHighlight = () => setForm(prev => ({ ...prev, client_highlights: [...(prev.client_highlights || []), { category: 'other', title: '', content: '' }] }));
 const updateClientHighlight = (index, field, value) => setForm(prev => ({ ...prev, client_highlights: prev.client_highlights.map((h, i) => i === index ? { ...h, [field]: value } : h) }));
 const removeClientHighlight = (index) => setForm(prev => ({ ...prev, client_highlights: prev.client_highlights.filter((_, i) => i !== index) }));

 const handleImageUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploading(true);
  try {
   const { file_url } = await api.integrations.Core.UploadFile({ file });
   update('image_url', file_url);
  } catch {
   toast.error('העלאת התמונה נכשלה');
  }
  setUploading(false);
 };

 const doSave = () => {
  if (!form.client_name.trim()) { toast.error('שם הלקוח הוא שדה חובה'); return; }
  const { client_highlights, ...projectData } = form;
  updateMutation.mutate({
   ...projectData,
   name: form.client_name.trim(),
   contract_value: form.contract_value ? Number(form.contract_value) : null,
   project_manager: form.project_manager || '',
   current_liaison: form.current_liaison || '',
   external_consultants: form.external_consultants || '',
   pilot_date: form.pilot_date || null,
   licensing_start_date: form.licensing_start_date || null,
   kickoff_date: form.kickoff_date || null,
   go_live_date: form.go_live_date || null,
   go_live_notes: form.go_live_notes || '',
   frozen_until: form.frozen_until || null,
   frozen_notes: form.frozen_notes || '',
   licensing_reminder_date: project.licensing_reminder_date || null,
   document_url: form.document_url || null,
   licensing_duration: form.licensing_duration ? Number(form.licensing_duration) : null,
   licensing_duration_unit: form.licensing_duration_unit || 'months',
   hidden_tabs: form.hidden_tabs || [],
   team_members: form.team_members || [],
   client_highlights,
  });
 };

 const handleSubmit = (e) => {
  e.preventDefault();
 };

 if (loadingAccess || isLoading || !form) {
  return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-accent border-t-primary rounded-full animate-spin"/></div>;
 }

 if (!isRealAdmin && !hasProject(projectId)) {
  return <AccessDenied currentUser={null} />;
 }

 const canEdit = isRealAdmin || hasProject(projectId);

 return (
  <div dir="rtl"className="w-full">
   {/* Sticky save bar */}
   <div className="sticky top-0 z-30 -mx-4 px-4 py-2.5 mb-3 bg-background/90 backdrop-blur-sm border-b border-border flex items-center justify-between gap-3">
    <BackButton onBeforeBack={handleBeforeBack} />
    <div className="flex items-center gap-2">
     <Button
      type="button"
      onClick={doSave}
      disabled={updateMutation.isPending}
      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 px-7 text-sm font-bold shadow-none gap-2"
     >
      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
      שמור שינויים
     </Button>
    </div>
   </div>
   <div className="mb-4 flex items-center gap-3"dir="rtl">
    {project?.image_url ? (
     <div className="w-11 h-11 rounded-lg overflow-hidden border border-border flex-shrink-0 shadow-sm">
      <img src={project.image_url} alt="לוגו פרויקט"className="w-full h-full object-cover"/>
     </div>
    ) : (
     <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center shadow-sm flex-shrink-0">
      <FileText className="w-5 h-5 text-primary-foreground"/>
     </div>
    )}
    <div className="text-right">
     <h1 className="text-2xl font-bold text-foreground leading-tight">עריכת פרויקט</h1>
     <p className="text-sm text-muted-foreground mt-0.5">{project?.client_name || project?.name}</p>
    </div>
   </div>

   <form id="edit-project-form"onSubmit={handleSubmit} className="space-y-4"dir="rtl">
    <div className="space-y-4">
      <Card className="border-border shadow-sm">
       <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
         {form.image_url ? (
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0 group">
           <img src={form.image_url} alt="תמונת פרויקט"className="w-full h-full object-cover"/>
           <button type="button"onClick={() => update('image_url', '')} className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-3 h-3"/>
           </button>
          </div>
         ) : (
          <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors flex-shrink-0">
           {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin"/> : <ImagePlus className="w-5 h-5 text-muted-foreground"/>}
           <input type="file"accept="image/*"onChange={handleImageUpload} className="hidden"disabled={uploading} />
          </label>
         )}
         <div className="flex-1 space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">שם הלקוח *</Label>
          <Input value={form.client_name} onChange={(e) => update('client_name', e.target.value)} placeholder="שם החברה / הגוף"className="h-10 rounded-lg text-base font-semibold"dir="rtl"/>
         </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
         <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">שווי חוזה (₪)</Label>
          <Input type="number"inputMode="decimal"value={form.contract_value} onChange={(e) => update('contract_value', e.target.value)} placeholder="0"className="h-9 rounded-lg text-sm"dir="rtl"/>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
       <CardContent className="p-4"dir="rtl">
        <div className="flex items-center gap-2.5 mb-2"><div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center"><SlidersHorizontal className="w-4 h-4 text-primary"/></div><h3 className="text-sm font-bold text-foreground">שדות מותאמים אישית</h3></div>
        <CustomFieldsSection projectId={projectId} canEdit={canEdit} embedded />
       </CardContent>
      </Card>

    </div>
   </form>
  </div>
 );
}
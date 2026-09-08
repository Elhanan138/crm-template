import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { FileText, Upload, ExternalLink, Loader2, Trash2, Pencil, Check, X, CalendarDays, FolderOpen, Edit3 } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import FormFillSheet from '@/components/admin/FormFillSheet';

const DOC_STATUS = {
 pending: { label: 'מעבד...', tone: 'warning' },
 ready: { label: 'מוכן', tone: 'success' },
 failed: { label: 'נכשל', tone: 'destructive' },
};

export default function ProjectDocuments({ project, bare = false }) {
 const queryClient = useQueryClient();
 const [uploading, setUploading] = useState(false);
 const [editingIndex, setEditingIndex] = useState(null);
 const [editName, setEditName] = useState('');
 const [ingestingUrls, setIngestingUrls] = useState(new Set());
 const [editSubmission, setEditSubmission] = useState(null);

 const { data: docTexts = [] } = useQuery({
  queryKey: ['projectDocTexts', project?.id],
  queryFn: () => api.entities.ProjectDocumentText.filter({ project_id: project.id }),
  enabled: !!project?.id,
 });

 const getDocStatus = (url) => {
  if (ingestingUrls.has(url)) return DOC_STATUS.pending;
  const dt = docTexts.find(d => d.doc_url === url);
  if (!dt) return null;
  return DOC_STATUS[dt.status] || null;
 };

 const getDocuments = () => {
  if (!project.document_url) return [];
  try {
   const parsed = JSON.parse(project.document_url);
   if (Array.isArray(parsed)) return parsed;
   return [{ url: project.document_url, name: 'מסמך פרויקט מקורי' }];
  } catch {
   return [{ url: project.document_url, name: 'מסמך פרויקט מקורי' }];
  }
 };

 const docs = getDocuments();

 const handleUpload = async (e) => {
  const fileList = Array.from(e.target.files || []);
  if (fileList.length === 0) return;
  setUploading(true);
  e.target.value = '';

  // Upload all files in parallel
  const uploadResults = await Promise.allSettled(
   fileList.map(file => api.integrations.Core.UploadFile({ file }))
  );

  const uploaded = [];
  for (let i = 0; i < uploadResults.length; i++) {
   const res = uploadResults[i];
   if (res.status === 'fulfilled') {
    uploaded.push({ url: res.value.file_url, name: fileList[i].name, uploaded_at: new Date().toISOString() });
   } else {
    toast.error(`העלאת "${fileList[i].name}"נכשלה`);
   }
  }

  if (uploaded.length > 0) {
   const updatedDocs = [...docs, ...uploaded];
   await api.entities.Project.update(project.id, { document_url: JSON.stringify(updatedDocs) });
   queryClient.invalidateQueries({ queryKey: ['project', project.id] });
   toast.success(uploaded.length === 1 ? 'המסמך הועלה בהצלחה' : `${uploaded.length} מסמכים הועלו בהצלחה`);
  }

  setUploading(false);

  // Trigger async ingestion for each uploaded file in parallel
  const ingestPromises = uploaded.map(async (doc) => {
   setIngestingUrls(prev => new Set([...prev, doc.url]));
   try {
    await api.functions.invoke('ingestProjectDocument', { projectId: project.id, docUrl: doc.url });
   } catch {
    // swallow — status will reflect failure via docTexts
   } finally {
    setIngestingUrls(prev => { const n = new Set(prev); n.delete(doc.url); return n; });
   }
  });
  await Promise.allSettled(ingestPromises);
  queryClient.invalidateQueries({ queryKey: ['projectDocTexts', project.id] });
 };

 const handleDelete = async (index) => {
  const deletedDoc = docs[index];
  const updatedDocs = docs.filter((_, i) => i !== index);
  await api.entities.Project.update(project.id, {
   document_url: updatedDocs.length > 0 ? JSON.stringify(updatedDocs) : null,
  });
  // Also clean up any orphaned ProjectDocumentText records for this doc URL
  if (deletedDoc?.url) {
   try {
    const orphaned = await api.entities.ProjectDocumentText.filter({ project_id: project.id, doc_url: deletedDoc.url });
    await Promise.all(orphaned.map(d => api.entities.ProjectDocumentText.delete(d.id)));
   } catch { /* non-critical */ }
   queryClient.invalidateQueries({ queryKey: ['projectDocTexts', project.id] });
  }
  queryClient.invalidateQueries({ queryKey: ['project', project.id] });
  toast.success('המסמך נמחק');
 };

 const handleRename = async (index) => {
  const name = editName.trim();
  if (!name) { setEditingIndex(null); return; }
  const updatedDocs = docs.map((d, i) => (i === index ? { ...d, name } : d));
  await api.entities.Project.update(project.id, { document_url: JSON.stringify(updatedDocs) });
  queryClient.invalidateQueries({ queryKey: ['project', project.id] });
  setEditingIndex(null);
  toast.success('שם המסמך עודכן');
 };

 const handleEditFormDoc = async (doc) => {
  if (!doc.submission_id) return;
  try {
   const submission = await api.entities.FormSubmission.get(doc.submission_id);
   let template = null;
   if (submission.template_id) {
    try { template = await api.entities.FormTemplate.get(submission.template_id); } catch { /* template may be deleted */ }
   }
   const form = template || {
    id: submission.template_id,
    title: submission.template_title || 'טופס',
    fields: submission.fields_snapshot || [],
   };
   setEditSubmission({ form, existingSubmission: submission });
  } catch {
   toast.error('טעינת המילוי נכשלה');
  }
 };

 const getFileName = (doc) => {
  if (doc.name) return doc.name;
  try {
   return decodeURIComponent(doc.url.split('/').pop().split('?')[0]);
  } catch {
   return 'מסמך';
  }
 };

 const parseDate = (doc) => {
  if (!doc.uploaded_at) return null;
  const d = new Date(doc.uploaded_at);
  return isNaN(d.getTime()) ? null : d;
 };

 return (
  <div className={bare ? '' : 'bg-card rounded-lg border border-border overflow-hidden shadow-sm'} dir="rtl">
   {/* Header */}
   <div className={`flex items-center justify-between ${bare ? 'pb-3' : 'px-4 py-3 border-b border-border'}`}>
    <div className="flex items-center gap-2">
     <FolderOpen className="w-4 h-4 text-primary"/>
     <h3 className="text-sm font-semibold text-foreground">מסמכים</h3>
     {docs.length > 0 && (
      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{docs.length}</span>
     )}
    </div>
    <label className="relative cursor-pointer">
     <input
      type="file"
      accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
      multiple
      onChange={handleUpload}
      disabled={uploading}
      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
     />
     <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-[11px] font-semibold hover:bg-primary/15 transition-all">
      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5"/>}
      {uploading ? 'מעלה...' : 'העלה'}
     </div>
    </label>
   </div>

   {/* Timeline list — matches MilestoneTimeline pattern */}
   {docs.length === 0 ? (
    <EmptyState
     icon={FolderOpen}
     title="אין מסמכים עדיין"
     description="העלה PDF / Word / Excel למאגר הידע של הפרויקט."
    />
   ) : (
    <div className={bare ? '' : 'px-4 py-4'}>
     <div className="relative pe-5">
      {/* Vertical connecting line */}
      <div className="absolute top-2 bottom-2 right-[11px] w-0.5 bg-border"/>
      <div className="space-y-4">
       {docs.map((doc, i) => {
        const date = parseDate(doc);
        return (
         <div key={i} className="relative flex items-start gap-4 group/doc">
          {/* Node — document icon in circle, connected by line */}
          <span className="relative z-10 w-6 h-6 mt-0.5 rounded-full border-2 border-border bg-card ring-4 ring-card flex items-center justify-center flex-shrink-0">
           <FileText className="w-3 h-3 text-primary"/>
          </span>

          <div className="flex-1 min-w-0">
           {/* Title / edit row */}
           {editingIndex === i ? (
            <div className="flex items-center gap-1.5">
             <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(i); if (e.key === 'Escape') setEditingIndex(null); }}
              autoFocus
              className="h-6 text-xs px-2 py-0"
             />
             <button onClick={() => handleRename(i)} className="w-5 h-5 rounded-full flex items-center justify-center text-primary hover:bg-primary/10"title="שמור">
              <Check className="w-3 h-3"/>
             </button>
             <button onClick={() => setEditingIndex(null)} className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"title="בטל">
              <X className="w-3 h-3"/>
             </button>
            </div>
           ) : (
            <p className="text-sm font-semibold text-foreground leading-snug truncate">{getFileName(doc)}</p>
           )}

           {/* Meta row — date badge + actions */}
           {editingIndex !== i && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
             {date ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
               <CalendarDays className="w-3 h-3"/>
               {formatDate(date, 'medium')}
              </span>
             ) : (
              <span className="text-[11px] text-muted-foreground">ללא תאריך</span>
             )}
             {getDocStatus(doc.url) && (
              <StatusBadge label={getDocStatus(doc.url).label} tone={getDocStatus(doc.url).tone} className="text-[10px] px-2 py-0.5"/>
             )}
             <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
             >
              <ExternalLink className="w-3 h-3"/>
              פתח
             </a>
             {doc.submission_id && (
              <>
               <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent-foreground bg-accent rounded-full px-2 py-0.5">
                <FileText className="w-2.5 h-2.5"/> טופס
               </span>
               <button
                onClick={() => handleEditFormDoc(doc)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
               >
                <Edit3 className="w-3 h-3"/>
                ערוך במערכת
               </button>
              </>
             )}
             <button
              onClick={() => { setEditingIndex(i); setEditName(getFileName(doc)); }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover/doc:opacity-100"
              title="ערוך שם"
             >
              <Pencil className="w-3 h-3"/>
             </button>
             <button
              onClick={() => handleDelete(i)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/doc:opacity-100"
              title="מחק מסמך"
             >
              <Trash2 className="w-3 h-3"/>
             </button>
            </div>
           )}
          </div>
         </div>
        );
       })}
      </div>
     </div>
    </div>
   )}

   {editSubmission && (
    <FormFillSheet
     open={!!editSubmission}
     onOpenChange={(o) => !o && setEditSubmission(null)}
     form={editSubmission.form}
     existingSubmission={editSubmission.existingSubmission}
     onSaved={() => queryClient.invalidateQueries({ queryKey: ['project', project.id] })}
    />
   )}
  </div>
 );
}
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { Button } from '@/components/ui/button';
import { Lock, AlertOctagon, RotateCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { optionalComponent } from '@/lib/optionalComponent';
import { useSystemFeature } from '@/hooks/useSystemFeature';

// Removed from the build entirely when the agent feature is switched off.
const ProjectAIChat = optionalComponent('agent', 'src/components/project/ProjectAIChat.jsx');
import ProjectInfoCards from '@/components/project/ProjectInfoCards';
import DocumentsButton from '@/components/project/DocumentsButton';
import ProjectTabNav from '@/components/project/ProjectTabNav';
import ProjectActionsMenu from '@/components/project/ProjectActionsMenu';
import ProjectAlertsSheet from '@/components/project/alerts/ProjectAlertsSheet';
import OverviewTab from '@/components/project/OverviewTab';
import TasksTab from '@/components/project/TasksTab';
import KnowledgeTab from '@/components/project/KnowledgeTab';
import FinanceTab from '@/components/project/FinanceTab';
import NotionTab from '@/components/project/NotionTab';
import ProjectPermissionsDialog from '@/components/project/ProjectPermissionsDialog';

import PdfExportDialog from '@/components/project/PdfExportDialog';
import ProjectPdfExport from '@/components/project/ProjectPdfExport';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { useAccessControl } from '@/hooks/useAccessControl';
import BackButton from '@/components/shared/BackButton';
import { PROJECT_TABS as TABS } from '@/components/project/projectTabs';
import { classifyProjectError } from '@/lib/projectFetch';
import { isObjectId, getProjectPath } from '@/lib/projectSlug';

export default function ProjectDetail() {
  const projectAgentEnabled = useSystemFeature('project_agent', 'agent');
 const { slug: slugOrId } = useParams();
 const navigate = useNavigate();
 const queryClient = useQueryClient();

 const [searchParams, setSearchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'overview';
 const focusItemId = searchParams.get('itemId');
 const setActiveTab = (tab) => setSearchParams({ tab });
 const clearFocusItem = useCallback(() => {
  const next = new URLSearchParams(searchParams);
  next.delete('itemId');
  setSearchParams(next);
 }, [searchParams, setSearchParams]);
 const [deleteProjectDialog, setDeleteProjectDialog] = useState(false);
 const [permsDialog, setPermsDialog] = useState(false);
 const [alertsOpen, setAlertsOpen] = useState(false);
 const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
 const [deleteError, setDeleteError] = useState(null);
 const pdfExportRef = useRef(null);
 const fileInputRef = useRef(null);
 const [uploadingImage, setUploadingImage] = useState(false);

 const { isRealAdmin, hasProject, canViewProject, effectiveUser, teamMember, isLoading: aclLoading } = useAccessControl();

 // Resolve slugOrId: if it's a MongoDB ObjectId, fetch directly by ID.
 // Otherwise treat it as a slug — fetch by slug filter.
 const looksLikeId = isObjectId(slugOrId);

 // canDelete is set after project loads — see below

 const { data: project, isLoading: loadingProject, error: projectError, refetch: refetchProject } = useQuery({
  queryKey: ['project', slugOrId],
  queryFn: async () => {
   if (looksLikeId) {
    return await api.entities.Project.get(slugOrId);
   }
   // Try slug filter
   try {
    const results = await api.entities.Project.filter({ slug: slugOrId });
    if (results && results.length > 0) return results[0];
   } catch {
    // filter failed — fall through to ID lookup
   }
   // Fallback: try as ID (in case it's a non-standard ID)
   try {
    return await api.entities.Project.get(slugOrId);
   } catch {
    return null;
   }
  },
  enabled: !!slugOrId,
  retry: 2,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  meta: { silent: true },
  placeholderData: () => {
   const cached = queryClient.getQueryData(['projects']);
   if (cached) {
    return cached.find(p => p.id === slugOrId || p.slug === slugOrId);
   }
   return undefined;
  },
 });

 // Per-project sub-tab ordering (persisted locally, keyed by stable project ID).
 const ORDER_KEY = `projectTabOrder_${project?.id || slugOrId}`;
 const [tabOrder, setTabOrder] = useState(() => {
  try {
   const saved = JSON.parse(localStorage.getItem(`projectTabOrder_${slugOrId}`));
   return Array.isArray(saved) ? saved : null;
  } catch { return null; }
 });
 // Migrate tab order from slugOrId key to stable project ID key once loaded
 useEffect(() => {
  if (project?.id && slugOrId !== project.id) {
   try {
    const fromKey = `projectTabOrder_${slugOrId}`;
    const toKey = `projectTabOrder_${project.id}`;
    const saved = localStorage.getItem(fromKey);
    if (saved && !localStorage.getItem(toKey)) {
     localStorage.setItem(toKey, saved);
     localStorage.removeItem(fromKey);
     setTabOrder(JSON.parse(saved));
    }
   } catch { /* ignore */ }
  }
 }, [project?.id, slugOrId]);
 const saveTabOrder = (ids) => {
  setTabOrder(ids);
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
 };

 // Redirect to canonical slug URL if the project was found via ID but has a slug
 useEffect(() => {
  if (project && project.slug && looksLikeId) {
   navigate(`${getProjectPath(project)}${window.location.search}`, { replace: true });
  }
 }, [project, looksLikeId, navigate]);

 // projectId resolves to the actual project ID once loaded; falls back to slugOrId during loading
 const projectId = project?.id || slugOrId;
 // Binary access check — use the real project ID (not the slug) so hasProject matches correctly.
 // If the project was directly loaded, RLS already verified read access — don't block on stale projectsMeta cache
 // (race condition right after project creation, before the list query refetches).
 const canAccess = canViewProject(projectId) || !!project;
 const canEdit = canAccess; // binary — same as canView
 const canDelete = canAccess; // project members can delete

 const projectErrorType = projectError ? classifyProjectError(projectError) : null;

 // PM / liaison check: project_manager and current_liaison are stored by NAME (not email)
 const isPmOrLiaison = !!teamMember && !!project && (
  (teamMember.name || '').trim().toLowerCase() === (project.project_manager || '').trim().toLowerCase() ||
  (teamMember.name || '').trim().toLowerCase() === (project.current_liaison || '').trim().toLowerCase()
 );
 const canManagePermissions = isRealAdmin || isPmOrLiaison;

 // Global tab visibility (org-level, admin-controlled)
 const { data: globalTabRes } = useQuery({
  queryKey: ['global-tab-visibility'],
  queryFn: () => api.functions.invoke('globalTabVisibility', {}),
 });
 const globalTabVisibility = globalTabRes?.data?.value || {};

 // Tabs the effective user is allowed to see, filtered by global visibility and project-level hidden tabs
 const projectHiddenTabs = project?.hidden_tabs || [];
 const baseAllowedTabs = TABS.filter(t => !t.hidden && hasProject(projectId) && (t.id === 'overview' || (globalTabVisibility[t.id] !== false && !projectHiddenTabs.includes(t.id))));
 // Apply the user's saved sub-tab order (opt-in); unknown/new tabs go to the end.
 const allowedTabs = tabOrder
  ? [
    ...tabOrder.map(id => baseAllowedTabs.find(t => t.id === id)).filter(Boolean),
    ...baseAllowedTabs.filter(t => !tabOrder.includes(t.id)),
   ]
  : baseAllowedTabs;

 // If current tab isn't allowed (or was hidden), fall back to overview
 useEffect(() => {
  if (aclLoading) return;
  if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeTab)) {
   setSearchParams({ tab: 'overview' });
  }
 }, [aclLoading, activeTab, allowedTabs.length]); 

 const { data: tasks = [] } = useQuery({
  queryKey: ['tasks', projectId],
  queryFn: () => api.entities.Task.filter({ project_id: projectId }, 'order'),
  enabled: !!projectId,
 });

 const { data: teamMembers = [] } = useQuery({
  queryKey: ['teamMembers'],
  queryFn: () => api.entities.TeamMember.list('name'),
 });

 const deleteProjectMutation = useMutation({
  mutationFn: async () => {
   await api.functions.invoke('deleteProjectCascade', { projectId });
  },
  onSuccess: () => {
   toast.success('הפרויקט נמחק');
   navigate('/');
  },
  onError: () => {
   setDeleteError('ERR_SAVE_FAILED_302');
   setDeleteProjectDialog(false);
  },
 });

 const handleImageUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !project) return;
  setUploadingImage(true);
  try {
   const { file_url } = await api.integrations.Core.UploadFile({ file });
   await api.entities.Project.update(project.id, { image_url: file_url });
   queryClient.invalidateQueries({ queryKey: ['project', slugOrId] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   toast.success('תמונת הפרויקט עודכנה');
  } catch {
   toast.error('העלאת התמונה נכשלה');
  }
  setUploadingImage(false);
  e.target.value = '';
 };

 if (loadingProject) {
  return (
   <div dir="rtl"className="animate-pulse space-y-6">
    <div className="h-4 w-24 bg-muted rounded-full"/>
    <div className="space-y-2">
     <div className="h-7 w-64 bg-muted rounded-lg"/>
     <div className="h-4 w-40 bg-muted rounded-lg"/>
    </div>
    <div className="flex gap-1 bg-muted/50 rounded-lg p-1.5">
     {[1,2,3,4].map(i => <div key={i} className="h-9 flex-1 bg-muted rounded-lg"/>)}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
     {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted rounded-lg"/>)}
    </div>
    <div className="h-48 bg-muted rounded-lg"/>
   </div>
  );
 }

 if (!project && projectErrorType) {
  if (projectErrorType === 'forbidden') {
   return (
    <div dir="rtl"className="max-w-lg mx-auto py-16">
     <div className="text-center mb-5">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
       <Lock className="w-6 h-6 text-muted-foreground"/>
      </div>
      <h2 className="text-lg font-bold text-foreground">אין לך גישה לפרויקט זה</h2>
     </div>
     <ErrorDisplay
      code="ERR_PROJECT_ACCESS_202"
      context={{ projectId, userEmail: effectiveUser?.email, page: 'ProjectDetail' }}
     />
     <div className="text-center">
      <div className="flex justify-center mt-3"><BackButton /></div>
     </div>
    </div>
   );
  }
  return (
   <div dir="rtl"className="max-w-lg mx-auto py-16">
    <div className="text-center mb-5">
     <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
      <AlertOctagon className="w-6 h-6 text-muted-foreground"/>
     </div>
     <h2 className="text-lg font-bold text-foreground">טעינת הפרויקט נכשלה</h2>
    </div>
    <ErrorDisplay
     code="ERR_PROJECT_LOAD_203"
     context={{ projectId, userEmail: effectiveUser?.email, page: 'ProjectDetail', rawError: projectError?.message }}
    />
    <div className="flex justify-center mt-3">
     <Button onClick={() => refetchProject()} className="rounded-full gap-2">
      <RotateCw className="w-4 h-4"/> נסה שוב
     </Button>
    </div>
    <div className="flex justify-center mt-2"><BackButton /></div>
   </div>
  );
 }

 if (!aclLoading && !canAccess) {
  return (
   <div dir="rtl"className="max-w-lg mx-auto py-16">
    <div className="text-center mb-5">
     <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
      <Lock className="w-6 h-6 text-muted-foreground"/>
     </div>
     <h2 className="text-lg font-bold text-foreground">אין לך גישה לפרויקט זה</h2>
    </div>
    <ErrorDisplay
     code="ERR_PROJECT_ACCESS_202"
     context={{ projectId, userEmail: effectiveUser?.email, page: 'ProjectDetail' }}
    />
    <div className="text-center">
     <div className="flex justify-center mt-3"><BackButton /></div>
    </div>
   </div>
  );
 }

 if (!project && !loadingProject) {
  return (
   <div dir="rtl"className="max-w-lg mx-auto py-16">
    <div className="text-center">
     <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
      <AlertOctagon className="w-6 h-6 text-muted-foreground"/>
     </div>
     <h2 className="text-lg font-bold text-foreground">הפרויקט לא נמצא</h2>
     <p className="text-sm text-muted-foreground mt-1">ייתכן שהפרויקט נמחק או שהקישור אינו תקין.</p>
     <div className="flex justify-center mt-5"><BackButton /></div>
    </div>
   </div>
  );
 }

 return (
  <div dir="rtl">
   {/* Back */}
   <BackButton className="mb-6"/>

   {/* Project Header */}
   <div className="flex items-center gap-3 mb-6">
    <input ref={fileInputRef} type="file"accept="image/*"onChange={handleImageUpload} className="hidden"/>
    {project.image_url ? (
     <img
      src={project.image_url}
      alt={project.client_name || project.name}
      onClick={() => canAccess && fileInputRef.current?.click()}
      className={`w-14 h-14 sm:w-[64px] sm:h-[64px] rounded-lg object-cover border border-border shadow-sm flex-shrink-0 bg-card ${uploadingImage ? 'opacity-50' : 'cursor-pointer hover:opacity-80'} transition-opacity`}
     />
    ) : (
     <div
      onClick={() => canAccess && fileInputRef.current?.click()}
      className={`w-14 h-14 sm:w-[64px] sm:h-[64px] rounded-lg border border-border bg-accent flex items-center justify-center flex-shrink-0 ${uploadingImage ? 'opacity-50' : 'cursor-pointer hover:bg-accent'} transition-colors`}
     >
      {uploadingImage ? (
       <Loader2 className="w-5 h-5 text-primary animate-spin"/>
      ) : (
       <span className="text-xl sm:text-2xl font-bold text-primary">{(project.client_name || project.name || '?')[0]}</span>
      )}
     </div>
    )}
    <div className="min-w-0 flex-1">
     <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{project.client_name || project.name}</h1>
     <div className="flex items-center gap-2 flex-wrap">
      {project.contract_value && (
       <p className="text-sm text-muted-foreground">₪{Number(project.contract_value).toLocaleString()}</p>
      )}
      <ProjectInfoCards project={project} teamMembers={teamMembers} />
     </div>
    </div>
    {/* Action buttons — folder docs + 3-dot menu */}
    <div className="flex items-center gap-1.5 flex-shrink-0">
     <DocumentsButton project={project} />
     <ProjectActionsMenu
     projectId={projectId}
     project={project}
     canEdit={canAccess}
     canDelete={canDelete}
     isRealAdmin={isRealAdmin}
     onPermissions={() => setPermsDialog(true)}
     onAlerts={() => setAlertsOpen(true)}
     onDelete={() => setDeleteProjectDialog(true)}
     onExportPdf={() => setPdfDialogOpen(true)}
    />
    </div>
   </div>

   {deleteError && (
    <div className="mb-6">
     <ErrorDisplay
      code={deleteError}
      context={{ projectId, userEmail: effectiveUser?.email, page: 'ProjectDetail', details: 'מחיקת פרויקט נכשלה' }}
     />
    </div>
   )}

   {/* Tab Navigation */}
   <ProjectTabNav tabs={allowedTabs} activeId={activeTab} onChange={setActiveTab} onReorder={saveTabOrder} />

   {/* Tab Content */}
   <div>
    <ErrorBoundary key={activeTab}>
     {activeTab === 'overview' && (
      <OverviewTab
       project={project}
       meetings={[]}
       tasks={tasks}
       canEditCustom={canAccess}
       onNavigate={setActiveTab}
      />
     )}
     {activeTab === 'finance' && (
      <FinanceTab projectId={projectId} focusItemId={focusItemId} onFocusHandled={clearFocusItem} />
     )}
     {activeTab === 'tasks' && (
      <TasksTab
       projectId={projectId}
       project={project}
       focusItemId={focusItemId}
       onFocusHandled={clearFocusItem}
      />
     )}
     {activeTab === 'knowledge' && (
      <KnowledgeTab project={project} />
     )}
     {activeTab === 'notion' && (
      <NotionTab projectId={projectId} project={project} />
     )}
    </ErrorBoundary>
   </div>

   {/* Floating AI Chat — only on the project management (overview) tab */}
   {activeTab === 'overview' && ProjectAIChat && projectAgentEnabled && (
    <React.Suspense fallback={null}>
     <ProjectAIChat project={project} teamMembers={teamMembers} />
    </React.Suspense>
   )}

   <ProjectPermissionsDialog
    projectId={projectId}
    projectName={project.client_name || project.name}
    project={project}
    teamMembers={teamMembers}
    open={permsDialog}
    onClose={() => setPermsDialog(false)}
    canManage={canManagePermissions}
    canTransferOwnership={canManagePermissions}
   />

   <ProjectAlertsSheet
    open={alertsOpen}
    onOpenChange={setAlertsOpen}
    project={project}
    teamMembers={teamMembers}
    currentUserEmail={effectiveUser?.email}
   />

   <PdfExportDialog
    open={pdfDialogOpen}
    onClose={() => setPdfDialogOpen(false)}
    onExport={(sections) => {
     pdfExportRef.current?.export(sections);
     setPdfDialogOpen(false);
    }}
   />

   <ProjectPdfExport ref={pdfExportRef} project={project} meetings={[]} />

   {/* Delete Project Dialog */}
   <DeleteDialog
    open={deleteProjectDialog}
    onOpenChange={setDeleteProjectDialog}
    onConfirm={() => deleteProjectMutation.mutate()}
    title="מחיקת פרויקט"
    description={`האם אתה בטוח שברצונך למחוק את הפרויקט "${project?.client_name || project?.name}"וכל אבני הדרך שלו? פעולה זו אינה ניתנת לביטול.`}
    confirmLabel="מחק פרויקט"
   />
  </div>
 );
}
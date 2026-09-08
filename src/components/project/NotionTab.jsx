import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Menu, Loader2, Check, AlertCircle, Archive } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import CardSkeleton from '@/components/shared/CardSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import { EMPTY_DOC } from '@/lib/notionDoc';
import { reorderPages } from '@/lib/pageTree';
import PageList from './notion/PageList';

const NotionEditorLazy = React.lazy(() => import('./notion/NotionEditor'));

const EMOJIS = ['📄', '📝', '📋', '📌', '📎', '🔖', '💡', '🎯', '✅', '⚠️', '🔥', '⭐', '✨', '🎉', '📅', '⏰', '🔒', '🔑', '💰', '📊', '📈', '👥', '👤', '🤝', '💬', '📧', '📞', '📱', '💻', '⚙️', '🔧', '🛠️', '📦', '🚀', '🏆', '📚', '🎓', '🧩', '🔍', '💡'];

const SAVE_DEBOUNCE = 800;

export default function NotionTab({ projectId, project }) {
 const queryClient = useQueryClient();
 const isMobile = useIsMobile();
 const [searchParams, setSearchParams] = useSearchParams();
 const activePageId = searchParams.get('page');
 const [mobileListOpen, setMobileListOpen] = useState(false);
 const [filter, setFilter] = useState('active');
 const [menuAction, setMenuAction] = useState(null); // { type, page }
 const [renameValue, setRenameValue] = useState('');
 const [deleteDialog, setDeleteDialog] = useState(null);
 const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
 const [pendingContent, setPendingContent] = useState(null);
 const debounceRef = useRef(null);

 const { data: pages = [], isLoading } = useQuery({
  queryKey: ['projectPages', projectId || 'global'],
  queryFn: () => projectId
   ? api.entities.ProjectPage.filter({ project_id: projectId }, 'order')
   : api.entities.ProjectPage.list('order'),
 });

 const activePages = useMemo(() => pages.filter(p => !p.is_archived), [pages]);
 const archivedCount = pages.filter(p => p.is_archived).length;

 const activePage = useMemo(() => {
  if (!activePageId) return null;
  return pages.find(p => p.id === activePageId) || null;
 }, [pages, activePageId]);

 const updateMutation = useMutation({
  mutationFn: ({ id, data }) => api.entities.ProjectPage.update(id, data),
  onMutate: () => setSaveState('saving'),
  onSuccess: () => {
   setSaveState('saved');
   setTimeout(() => setSaveState('idle'), 2000);
   queryClient.invalidateQueries({ queryKey: ['projectPages', projectId || 'global'] });
  },
  onError: () => {
   setSaveState('error');
   toast.error('שמירת העמוד נכשלה', {
    action: { label: 'נסה שוב', onClick: () => flushPending() },
   });
  },
 });

 const createMutation = useMutation({
  mutationFn: (data) => api.entities.ProjectPage.create({
   ...data,
   project_id: projectId || null,
   member_emails: project?.member_emails || [],
  }),
  onSuccess: (newPage) => {
   queryClient.invalidateQueries({ queryKey: ['projectPages', projectId || 'global'] });
   setActivePage(newPage.id);
  },
  onError: () => toast.error('יצירת העמוד נכשלה'),
 });

 const deleteMutation = useMutation({
  mutationFn: (id) => api.entities.ProjectPage.delete(id),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['projectPages', projectId || 'global'] });
   toast.success('העמוד נמחק');
  },
  onError: (e) => toast.error(e?.message || 'מחיקת העמוד נכשלה'),
 });

 const archiveMutation = useMutation({
  mutationFn: (id) => api.entities.ProjectPage.update(id, { is_archived: true }),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['projectPages', projectId || 'global'] });
   toast.success('העמוד הועבר לארכיון', {
    action: {
     label: 'בטל',
     onClick: () => {
      // Undo is handled by the caller since we don't have the id here
     },
    },
   });
  },
  onError: (e) => toast.error(e?.message || 'העברת העמוד לארכיון נכשלה'),
 });

 const setActivePage = useCallback((id) => {
  const next = new URLSearchParams(searchParams);
  if (id) next.set('page', id);
  else next.delete('page');
  setSearchParams(next, { replace: true });
 }, [searchParams, setSearchParams]);

 // Auto-select first page if none selected
 useEffect(() => {
  if (!isLoading && activePages.length > 0 && !activePageId) {
   setActivePage(activePages[0].id);
  }
 }, [isLoading, activePages, activePageId, setActivePage]);

 // Debounced save
 const flushPending = useCallback(() => {
  if (!pendingContent || !activePage) return;
  updateMutation.mutate({ id: activePage.id, data: pendingContent });
  setPendingContent(null);
 }, [pendingContent, activePage, updateMutation]);

 useEffect(() => {
  if (!pendingContent || !activePage) return;
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
   updateMutation.mutate({ id: activePage.id, data: pendingContent });
   setPendingContent(null);
  }, SAVE_DEBOUNCE);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
 }, [pendingContent, activePage, updateMutation]);

 // Save on page switch
 useEffect(() => {
  return () => {
   if (debounceRef.current) clearTimeout(debounceRef.current);
   // TODO: flush pending content on unmount — requires a ref to the latest pendingContent
  };
 }, []);

 const handleEditorChange = useCallback((content) => {
  setPendingContent(prev => ({ ...prev, ...content, last_edited_by: null }));
 }, []);

 const handleNewPage = (parentPageId = null) => {
  createMutation.mutate({
   title: 'עמוד ללא שם',
   icon: '📄',
   content_json: EMPTY_DOC,
   content_text: '',
   parent_page_id: parentPageId,
   order: pages.length,
  });
 };

 const handleNewSection = () => {
  createMutation.mutate({
   title: 'נושא חדש',
   icon: '📁',
   content_json: EMPTY_DOC,
   content_text: '',
   parent_page_id: null,
   order: pages.length,
  });
 };

 const handleNewPageInSection = (sectionId) => {
  const childCount = pages.filter(p => p.parent_page_id === sectionId).length;
  createMutation.mutate({
   title: 'עמוד ללא שם',
   icon: '📄',
   content_json: EMPTY_DOC,
   content_text: '',
   parent_page_id: sectionId,
   order: childCount,
  });
 };

 const handleMenu = (type, page) => {
  if (type === 'rename') {
   setRenameValue(page.title || '');
   setMenuAction({ type, page });
  } else if (type === 'duplicate') {
   createMutation.mutate({
    title: `${page.title || 'עמוד'} (עותק)`,
    icon: page.icon || '📄',
    content_json: page.content_json || EMPTY_DOC,
    content_text: page.content_text || '',
    parent_page_id: null,
    order: pages.length,
   });
   toast.success('העמוד שוכפל');
  } else if (type === 'subpage') {
   handleNewPage(page.id);
  } else if (type === 'archive') {
   archiveMutation.mutate(page.id);
  } else if (type === 'delete') {
   setDeleteDialog(page);
  }
 };

 const handleRename = () => {
  if (!menuAction?.page) return;
  updateMutation.mutate({ id: menuAction.page.id, data: { title: renameValue.trim() || 'עמוד ללא שם' } });
  setMenuAction(null);
 };

 const handleReorder = (pageId, _newIndex) => {
  const rootPages = activePages;
  const reordered = reorderPages(rootPages, pageId, 'up'); // simplified
  // Update order for changed pages
  const updates = reordered.filter((p, _i) => p.order !== (rootPages.find(rp => rp.id === p.id)?.order || 0));
  if (updates.length > 0) {
   Promise.all(updates.map(p => api.entities.ProjectPage.update(p.id, { order: p.order })))
    .then(() => queryClient.invalidateQueries({ queryKey: ['projectPages', projectId || 'global'] }));
  }
 };

 if (isLoading) {
  return <CardSkeleton count={3} className="grid grid-cols-1"/>;
 }

 if (pages.length === 0) {
  return (
   <div className="bg-card rounded-lg border border-border shadow-sm p-8">
    <EmptyState
     icon={Plus}
     title={projectId ? "אין פתקים בפרויקט" : "אין פתקים עדיין"}
     description="צור נושאים כמו הדרכות, תהליכים או פגישות, וארגן את הפתקים בצורה נוחה — בדיוק כמו מחברת OneNote."
     action={
      <Button onClick={() => handleNewSection()} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full gap-2">
       <Plus className="w-4 h-4"/> צור נושא ראשון
      </Button>
     }
    />
   </div>
  );
 }

 return (
  <div className="flex gap-4 items-start"style={{ minHeight: 'calc(100dvh - 200px)' }}>
   <PageList
    pages={pages}
    activePageId={activePageId}
    onSelect={setActivePage}
    onMenu={handleMenu}
    onReorder={handleReorder}
    onNewSection={handleNewSection}
    onNewPageInSection={handleNewPageInSection}
    isMobile={isMobile}
    mobileOpen={mobileListOpen}
    onMobileClose={setMobileListOpen}
    filter={filter}
    setFilter={setFilter}
    archivedCount={archivedCount}
    projectId={projectId}
   />

   <div className="flex-1 min-w-0 flex flex-col"style={{ minHeight: 0 }}>
    {activePage ? (
     <>
      {/* Page header */}
      <div className="flex items-center gap-2 mb-3">
       {isMobile && (
        <Button variant="ghost"size="icon"className="h-9 w-9 flex-shrink-0"aria-label="פתח רשימת עמודים"onClick={() => setMobileListOpen(true)}>
         <Menu className="w-4 h-4"/>
        </Button>
       )}
       <Popover>
        <PopoverTrigger asChild>
         <button className="text-2xl flex-shrink-0 hover:bg-muted rounded px-1 transition-colors"title="בחר אייקון">
          {activePage.icon || '📄'}
         </button>
        </PopoverTrigger>
        <PopoverContent align="start"className="w-64 p-2">
         <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map(emoji => (
           <button
            key={emoji}
            onClick={() => {
             updateMutation.mutate({ id: activePage.id, data: { icon: emoji } });
            }}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-lg"
           >
            {emoji}
           </button>
          ))}
         </div>
        </PopoverContent>
       </Popover>
       <input
        type="text"
        value={activePage.title || ''}
        onChange={(e) => {
         const newTitle = e.target.value;
         // Update local state immediately
         queryClient.setQueryData(['projectPages', projectId || 'global'], old => (old || []).map(p => p.id === activePage.id ? { ...p, title: newTitle } : p));
         setPendingContent(prev => ({ ...prev, title: newTitle }));
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-foreground bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/60"
        placeholder="עמוד ללא שם"
       />
       {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0"/>}
       {saveState === 'saved' && <Check className="w-4 h-4 text-success flex-shrink-0"/>}
       {saveState === 'error' && <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0"/>}
       {saveState === 'saving' && <span className="text-xs text-muted-foreground hidden sm:inline">שומר...</span>}
       {saveState === 'saved' && <span className="text-xs text-muted-foreground hidden sm:inline">נשמר</span>}
       {saveState === 'error' && <span className="text-xs text-destructive hidden sm:inline">שגיאת שמירה</span>}
      </div>

      {/* Editor */}
      <React.Suspense fallback={<CardSkeleton count={1} className="grid grid-cols-1"/>}>
       <NotionEditorLazy key={activePage.id} page={activePage} onChange={handleEditorChange} />
      </React.Suspense>
     </>
    ) : (
     <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">בחר עמוד מהרשימה</p>
     </div>
    )}
   </div>

   {/* Rename dialog */}
   {menuAction?.type === 'rename' && (
    <AlertDialog open onOpenChange={(v) => !v && setMenuAction(null)}>
     <AlertDialogContent className="rounded-lg">
      <AlertDialogHeader className="text-right">
       <AlertDialogTitle className="text-right">שינוי שם עמוד</AlertDialogTitle>
      </AlertDialogHeader>
      <Input
       value={renameValue}
       onChange={e => setRenameValue(e.target.value)}
       onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
       autoFocus
       className="rounded-lg"
      />
      <AlertDialogFooter className="flex-row-reverse gap-2">
       <AlertDialogCancel className="rounded-full mt-0">ביטול</AlertDialogCancel>
       <AlertDialogAction className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"onClick={handleRename}>
        שמור
       </AlertDialogAction>
      </AlertDialogFooter>
     </AlertDialogContent>
    </AlertDialog>
   )}

   {/* Delete / Archive dialog */}
   <DeleteDialog
    open={!!deleteDialog}
    onOpenChange={(v) => !v && setDeleteDialog(null)}
    onConfirm={() => { deleteMutation.mutate(deleteDialog.id); setDeleteDialog(null); }}
    title={`מחיקת "${deleteDialog?.title}"`}
    description="בחר פעולה. מחיקה היא לצמיתות ואינה הפיכה. העברה לארכיון ניתנת לשחזור."
    confirmLabel="מחק לצמיתות"
    extraActions={
     <Button
      variant="outline"
      onClick={() => { archiveMutation.mutate(deleteDialog.id); setDeleteDialog(null); }}
      className="gap-2 rounded-full"
     >
      <Archive className="w-4 h-4"/>
      העבר לארכיון
     </Button>
    }
   />
  </div>
 );
}
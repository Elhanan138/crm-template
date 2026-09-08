import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { Plus, Trash2, Pencil, Copy, Archive, Search, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PopupEditorSheet from './PopupEditorSheet';
import { formatDate as fmtDate } from '@/lib/formatDate';

const LAYOUT_LABELS = { announcement: 'הכרזה', changelog: 'מה חדש', alert: 'התראה' };
const FREQ_LABELS = { once_ever: 'פעם אחת', once_per_session: 'פעם לסשן', every_login: 'כל כניסה' };

function formatDate(dt) {
  if (!dt) return '—';
  return fmtDate(dt, 'datetime');
}

export default function PopupManagementPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, popup: null });

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ['announcementPopups'],
    queryFn: () => api.entities.AnnouncementPopup.list('-updated_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.AnnouncementPopup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcementPopups'] });
      setDeleteDialog({ open: false, popup: null });
      toast.success('הפופאפ נמחק');
    },
    onError: () => toast.error('המחיקה נכשלה'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (popup) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = popup;
      return api.entities.AnnouncementPopup.create({ ...rest, title: `${popup.title} (עותק)`, status: 'draft' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcementPopups'] });
      toast.success('הפופאפ שוכפל');
    },
    onError: () => toast.error('השכפול נכשל'),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ popup, status }) => api.entities.AnnouncementPopup.update(popup.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcementPopups'] });
      toast.success('הסטטוס עודכן');
    },
    onError: () => toast.error('העדכון נכשל'),
  });

  const filtered = popups.filter(p => !search.trim() || (p.title || '').toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEditingPopup(null); setEditorOpen(true); };
  const openEdit = (popup) => { setEditingPopup(popup); setEditorOpen(true); };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-section-title text-foreground">פופאפים והכרזות</h2>
              <p className="text-caption">{popups.length} פופאפים במערכת</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש..." className="h-9 pe-9 rounded-full text-sm" />
            </div>
            <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm gap-1.5 flex-shrink-0">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">פופאפ חדש</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5"><ListSkeleton count={4} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={search ? 'לא נמצאו תוצאות' : 'אין פופאפים עדיין'}
            description={search ? 'נסה לחפש כותרת אחרת' : 'צור את הפופאפ הראשון כדי להתחיל'}
            action={!search ? (
              <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm gap-2">
                <Plus className="w-4 h-4" /> פופאפ חדש
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((popup) => (
              <div key={popup.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate text-right">{popup.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{LAYOUT_LABELS[popup.layoutType] || popup.layoutType}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{FREQ_LABELS[popup.frequency] || popup.frequency}</span>
                    {popup.showDismissCheckbox && (
                      <>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-primary">צ'קבוקס "אל תציג שוב"</span>
                      </>
                    )}
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(popup.startsAt)}</span>
                    {popup.endsAt && <span className="text-[11px] text-muted-foreground">עד {formatDate(popup.endsAt)}</span>}
                  </div>
                </div>
                <div className="hidden sm:block flex-shrink-0">
                  <StatusBadge status={popup.status} label={popup.status === 'draft' ? 'טיוטה' : popup.status === 'scheduled' ? 'מתוזמן' : popup.status === 'active' ? 'פעיל' : 'בארכיון'} tone={popup.status === 'active' ? 'success' : popup.status === 'scheduled' ? 'info' : 'neutral'} />
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="ערוך פופאפ" onClick={() => openEdit(popup)}>
                                       <Pencil className="w-3.5 h-3.5" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="שכפל פופאפ" onClick={() => duplicateMutation.mutate(popup)}>
                                       <Copy className="w-3.5 h-3.5" />
                                     </Button>
                                     {popup.status === 'archived' ? (
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="הוצא מארכיון" title="הוצא מארכיון" onClick={() => archiveMutation.mutate({ popup, status: 'draft' })}>
                                         <Archive className="w-3.5 h-3.5" />
                                       </Button>
                                     ) : (
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" aria-label="העבר לארכיון" title="העבר לארכיון" onClick={() => archiveMutation.mutate({ popup, status: 'archived' })}>
                                         <Archive className="w-3.5 h-3.5" />
                                       </Button>
                                     )}
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="מחק פופאפ" onClick={() => setDeleteDialog({ open: true, popup })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PopupEditorSheet open={editorOpen} popup={editingPopup} onClose={() => setEditorOpen(false)} />

      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) => { if (!open) setDeleteDialog({ open: false, popup: null }); }}
        onConfirm={() => deleteMutation.mutate(deleteDialog.popup?.id)}
        title="מחיקת פופאפ"
        description={`האם למחוק את "${deleteDialog.popup?.title}"? לא ניתן לשחזר.`}
      />
    </div>
  );
}
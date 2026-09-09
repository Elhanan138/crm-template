import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { List, Columns3, MousePointerClick } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import DeleteDialog from '@/components/shared/DeleteDialog';
import EmptyState from '@/components/shared/EmptyState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import WorkspaceMetrics from './workspace/WorkspaceMetrics';
import TicketListPane from './workspace/TicketListPane';
import TicketDetailPanel from './workspace/TicketDetailPanel';
import TicketKanban from './workspace/TicketKanban';
import InternalItemSheet from './workspace/InternalItemSheet';

const VIEW_KEY = 'support_view_mode';

// Dev management workspace: smart list + fixed detail panel (desktop) / Sheet (mobile),
// with a secondary kanban view. One queue for user tickets and admin-initiated items.
export default function AdminWorkspace({ tickets, isLoading, initialTicketId }) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { currentUser, teamMembers } = useAccessControl();
  const [viewMode, setViewModeState] = useState(() => localStorage.getItem(VIEW_KEY) || 'list');
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (initialTicketId) {
      setSelectedId(initialTicketId);
      // Desktop list view shows the ticket in the fixed panel — Sheet only where needed
      if (window.innerWidth < 1024 || localStorage.getItem(VIEW_KEY) === 'kanban') setSheetOpen(true);
    }
  }, [initialTicketId]);

  const setViewMode = (v) => {
    setViewModeState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ }
  };

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list('-created_date'),
  });

  const selected = selectedId ? tickets.find(t => t.id === selectedId) || null : null;

  // Optimistic single update — the decision row must feel instant
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => api.entities.SupportTicket.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['supportTickets'] });
      const prev = queryClient.getQueryData(['supportTickets']);
      queryClient.setQueryData(['supportTickets'], old =>
        (old || []).map(t => t.id === id ? { ...t, ...patch, updated_date: new Date().toISOString() } : t)
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      queryClient.setQueryData(['supportTickets'], ctx?.prev);
      toast.error('העדכון נכשל: ' + e.message);
    },
    onSuccess: () => toast.success('עודכן', { duration: 2500 }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['supportTickets'] }),
  });

  const batchMutation = useMutation({
    mutationFn: async ({ ids, patch }) => {
      await Promise.all(ids.map(id => api.entities.SupportTicket.update(id, patch)));
    },
    onMutate: async ({ ids, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['supportTickets'] });
      const prev = queryClient.getQueryData(['supportTickets']);
      queryClient.setQueryData(['supportTickets'], old =>
        (old || []).map(t => ids.includes(t.id) ? { ...t, ...patch, updated_date: new Date().toISOString() } : t)
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      queryClient.setQueryData(['supportTickets'], ctx?.prev);
      toast.error('העדכון נכשל: ' + e.message);
    },
    onSuccess: () => toast.success('הפניות עודכנו', { duration: 2500 }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['supportTickets'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.SupportTicket.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      setDeleteTarget(null);
      setSheetOpen(false);
      setSelectedId(null);
      toast.success('הפנייה נמחקה', { duration: 2500 });
    },
    onError: (e) => toast.error('המחיקה נכשלה: ' + e.message),
  });

  const handleUpdate = (id, patch) => updateMutation.mutate({ id, patch });

  const handleOpen = (ticket) => {
    setSelectedId(ticket.id);
    if (isMobile || viewMode === 'kanban') setSheetOpen(true);
  };

  const detailProps = { projects, teamMembers, onUpdate: handleUpdate, onDelete: setDeleteTarget };

  return (
    <div className="space-y-4">
      {/* Metrics + view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <WorkspaceMetrics tickets={tickets} />
        <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1">
          {[
            { key: 'list', label: 'רשימה', icon: List },
            { key: 'kanban', label: 'קנבן', icon: Columns3 },
          ].map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  viewMode === v.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton count={5} />
      ) : viewMode === 'kanban' ? (
        <TicketKanban tickets={tickets} teamMembers={teamMembers} onOpen={handleOpen} onUpdate={handleUpdate} />
      ) : (
        <div className="lg:grid lg:grid-cols-5 lg:gap-5 lg:items-start">
          {/* List — right side (~40%) */}
          <div className="lg:col-span-2">
            <TicketListPane
              tickets={tickets}
              teamMembers={teamMembers}
              activeId={selectedId}
              onOpen={handleOpen}
              onNewInternal={() => setInternalOpen(true)}
              onBatch={(ids, patch) => batchMutation.mutate({ ids, patch })}
              batchPending={batchMutation.isPending}
            />
          </div>
          {/* Fixed detail panel — left side, desktop only */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 bg-card border border-border rounded-xl shadow-sm p-5">
              {selected ? (
                <TicketDetailPanel ticket={selected} {...detailProps} />
              ) : (
                <EmptyState
                  icon={MousePointerClick}
                  title="בחר פנייה"
                  description="לחיצה על שורה ברשימה תציג כאן את הפרטים המלאים."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile / kanban detail sheet */}
      <Sheet open={sheetOpen && !!selected} onOpenChange={o => !o && setSheetOpen(false)}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto p-5">
          <SheetHeader className="text-start">
            <SheetTitle>פרטי פנייה</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {selected && <TicketDetailPanel ticket={selected} {...detailProps} />}
          </div>
        </SheetContent>
      </Sheet>

      <InternalItemSheet open={internalOpen} onOpenChange={setInternalOpen} user={currentUser} projects={projects} />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        title="מחיקת פנייה"
        description={`האם למחוק את הפנייה "${deleteTarget?.title}"? פעולה זו אינה הפיכה.`}
      />
    </div>
  );
}
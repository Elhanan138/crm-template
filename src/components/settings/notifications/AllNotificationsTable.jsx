import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Bell, Mail, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import DeleteDialog from '@/components/shared/DeleteDialog';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';

const PAGE_SIZE = 20;

const TYPE_LABELS = {
  alert: 'אלרט פרויקט',
  reminder: 'תזכורת',
  highlight: 'תזכורת נקודה',
};

const TYPE_TONES = {
  alert: 'info',
  reminder: 'warning',
  highlight: 'success',
};

export default function AllNotificationsTable({ items = [], loading }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterProject, setFilterProject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  // Unique projects for filter
  const projects = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.project_name) set.add(i.project_name); });
    return Array.from(set).sort();
  }, [items]);

  // Filter
  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filterProject !== 'all' && item.project_name !== filterProject) return false;
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        const text = `${item.project_name} ${item.recipient_email} ${item.when} ${TYPE_LABELS[item.type] || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterProject, filterType, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useMemo(() => setPage(1), [filterProject, filterType, search]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => api.functions.invoke('notificationsAdmin', { action: 'setActive', id, active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      toast.success('הסטטוס עודכן');
    },
    onError: () => toast.error('העדכון נכשל'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }) => api.functions.invoke('notificationsAdmin', { action: 'delete', id, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      toast.success('ההתראה נמחקה');
      setDeleting(null);
    },
    onError: () => toast.error('המחיקה נכשלה'),
  });

  const renderChannels = (channels) => {
    if (!channels) return '—';
    const parts = [];
    if (channels.bell) parts.push(<span key="b" className="inline-flex items-center gap-0.5"><Bell className="w-3 h-3" /></span>);
    if (channels.email) parts.push(<span key="e" className="inline-flex items-center gap-0.5"><Mail className="w-3 h-3" /></span>);
    return parts.length > 0 ? <div className="flex items-center gap-1.5">{parts}</div> : '—';
  };

  const renderRow = (item) => (
    <tr key={`${item.type}-${item.id}`} className="border-b border-border hover:bg-muted/30">
      <td className="px-3 py-2.5 text-sm">
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-${TYPE_TONES[item.type]}-muted text-${TYPE_TONES[item.type]}`}>
          {TYPE_LABELS[item.type] || item.type}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-foreground truncate max-w-[160px]">{item.project_name}</td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground truncate max-w-[180px]">{item.recipient_email || '—'}</td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{item.when || '—'}</td>
      <td className="px-3 py-2.5 text-sm">{renderChannels(item.channels)}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          {item.type === 'alert' && (
            <Switch
              checked={item.active}
              onCheckedChange={(v) => toggleMutation.mutate({ id: item.id, active: v })}
              disabled={toggleMutation.isPending}
            />
          )}
          {item.type !== 'alert' && (
            <span className={`text-[11px] ${item.active ? 'text-success' : 'text-muted-foreground'}`}>
              {item.active ? 'פעיל' : 'הושלם'}
            </span>
          )}
          <button
            onClick={() => setDeleting(item)}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="מחק"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={`${item.type}-${item.id}`} className="rounded-lg border border-border p-3 bg-muted/20 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-${TYPE_TONES[item.type]}-muted text-${TYPE_TONES[item.type]}`}>
          {TYPE_LABELS[item.type] || item.type}
        </span>
        <button onClick={() => setDeleting(item)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-sm font-medium text-foreground truncate">{item.project_name}</div>
      <div className="text-xs text-muted-foreground truncate">{item.recipient_email || '—'}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{item.when || '—'}</span>
        {renderChannels(item.channels)}
      </div>
      {item.type === 'alert' && (
        <Switch
          checked={item.active}
          onCheckedChange={(v) => toggleMutation.mutate({ id: item.id, active: v })}
          disabled={toggleMutation.isPending}
        />
      )}
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <ListChecks className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">כל ההתראות במערכת</h3>
          <p className="text-[11px] text-muted-foreground">תצוגה מאוחדת של אלרטים, תזכורות ונקודות לקוח — כל הפרויקטים</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="חיפוש חופשי..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs max-w-[200px]"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="alert">אלרטים</SelectItem>
            <SelectItem value="reminder">תזכורות</SelectItem>
            <SelectItem value="highlight">נקודות לקוח</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הפרויקטים</SelectItem>
            {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title="אין התראות" description="אין התראות פעילות במערכת" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-right">
                  <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">סוג</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">פרויקט</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">נמען</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">מתי יופעל</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">ערוצים</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">פעיל</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(renderRow)}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {paginated.map(renderCard)}
          </div>

          <Pagination
            total={filtered.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <DeleteDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={() => deleteMutation.mutate({ id: deleting?.id, type: deleting?.type })}
        title="מחיקת התראה"
        description={deleting ? `האם למחוק את ההתראה מ"${deleting.project_name}"?` : ''}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { Search, X, Plus, ChevronDown, ChevronLeft, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TYPE_CONFIG } from '../supportConfig';
import { GROUPS, groupOf } from './supportGroups';
import TicketRow from './TicketRow';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';

// The smart list: search + filters, decision-based groups, multi-select batch actions.
export default function TicketListPane({ tickets, teamMembers = [], activeId, onOpen, onNewInternal, onBatch, batchPending }) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.SupportTicket.update(id, data),
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['tickets'] }); },
    // A ticket dragged to another state that quietly snaps back is the worst
    // kind of failure: it looks like the list, not the save, is broken.
    onError: (e) => toast.error(e?.message || 'עדכון הפנייה נכשל'),
  });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(GROUPS.map(g => [g.key, g.defaultCollapsed]))
  );
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = useMemo(() => tickets
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => priorityFilter === 'all' || (t.priority || 'medium') === priorityFilter)
    .filter(t => sourceFilter === 'all' || (sourceFilter === 'internal' ? !!t.internal : !t.internal))
    .filter(t => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (t.title || '').toLowerCase().includes(q)
        || (t.description || '').toLowerCase().includes(q)
        || (t.submitted_by || '').toLowerCase().includes(q);
    }), [tickets, typeFilter, priorityFilter, sourceFilter, search]);

  const grouped = GROUPS.map(g => ({ ...g, items: filtered.filter(t => groupOf(t) === g.key) }));
  const hasFilters = search.trim() || typeFilter !== 'all' || priorityFilter !== 'all' || sourceFilter !== 'all';
  const toggleSelect = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const applyBatch = (patch) => { onBatch(selectedIds, patch); setSelectedIds([]); };

  return (
    <div className="space-y-3">
      {/* Search + new internal item */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="h-9 ps-9 text-sm"
          />
        </div>
        <Button size="sm" onClick={onNewInternal} className="gap-1 flex-shrink-0 h-9">
          <Plus className="w-3.5 h-3.5" />
          פריט פיתוח
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-8 text-xs w-auto gap-1"><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל המקורות</SelectItem>
            <SelectItem value="users">פניות משתמשים</SelectItem>
            <SelectItem value="internal">יזום</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-auto gap-1"><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל הסוגים</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 text-xs w-auto gap-1"><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל העדיפויות</SelectItem>
            <SelectItem value="high">גבוהה</SelectItem>
            <SelectItem value="medium">בינונית</SelectItem>
            <SelectItem value="low">נמוכה</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setTypeFilter('all'); setPriorityFilter('all'); setSourceFilter('all'); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1">
            <X className="w-3 h-3" /> נקה
          </button>
        )}
      </div>

      {/* Batch actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-3 py-2 bg-accent/50 rounded-lg border border-brand/20">
          <span className="text-xs font-semibold text-foreground">{selectedIds.length} נבחרו</span>
          <Select onValueChange={(v) => applyBatch({ status: v })} disabled={batchPending}>
            <SelectTrigger className="h-7 text-xs w-auto gap-1"><SelectValue placeholder="שנה סטטוס" /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="open">פתוח</SelectItem>
              <SelectItem value="in_review">בבדיקה</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
              <SelectItem value="on_hold">מוקפא</SelectItem>
              <SelectItem value="resolved">בוצע</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => applyBatch({ priority: v })} disabled={batchPending}>
            <SelectTrigger className="h-7 text-xs w-auto gap-1"><SelectValue placeholder="שנה עדיפות" /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="high">גבוהה</SelectItem>
              <SelectItem value="medium">בינונית</SelectItem>
              <SelectItem value="low">נמוכה</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground ms-auto">ביטול</button>
        </div>
      )}

      {/* Groups */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground bg-card rounded-lg border border-border">
          <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p>{hasFilters ? 'לא נמצאו פניות התואמות לסינון.' : 'אין פניות בתור.'}</p>
        </div>
      ) : (
        grouped.map(g => (
          <div key={g.key}>
            <button
              onClick={() => setCollapsed(c => ({ ...c, [g.key]: !c[g.key] }))}
              className="w-full flex items-center gap-2 py-1.5 text-sm font-semibold text-foreground"
            >
              {collapsed[g.key] ? <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              {g.label}
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{g.items.length}</span>
            </button>
            {!collapsed[g.key] && (
              <div className="space-y-2 mt-1">
                {g.items.length === 0 ? (
                  <p className="text-caption py-2 ps-6">אין פריטים</p>
                ) : (
                  g.items.map(t => (
                    <TicketRow
                      key={t.id}
                      ticket={t}
                      teamMembers={teamMembers}
                      active={t.id === activeId}
                      selected={selectedIds.includes(t.id)}
                      onToggleSelect={toggleSelect}
                      onOpen={onOpen}
                      onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
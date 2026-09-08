import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TYPE_CONFIG } from './supportConfig';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import TicketConversationModal from './TicketConversationModal';
import { formatDate } from '@/lib/formatDate';

const STATUS_OPTIONS = [
 { value: 'all', label: 'כל הסטטוסים' },
 { value: 'open', label: 'פתוח' },
 { value: 'in_review', label: 'בבדיקה' },
 { value: 'in_progress', label: 'בטיפול' },
 { value: 'on_hold', label: 'מוקפא' },
 { value: 'resolved', label: 'בוצע' },
];

export default function UserTicketList({ tickets, isLoading, initialTicketId }) {
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [typeFilter, setTypeFilter] = useState('all');
 const [selectedTicket, setSelectedTicket] = useState(null);

 // Auto-open from URL param
 useEffect(() => {
  if (initialTicketId && tickets.length > 0) {
   const t = tickets.find(t => t.id === initialTicketId);
   if (t) setSelectedTicket(t);
  }
 }, [initialTicketId, tickets]);

 const filtered = useMemo(() => {
  return tickets
   .filter(t => statusFilter === 'all' || t.status === statusFilter)
   .filter(t => typeFilter === 'all' || t.type === typeFilter)
   .filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (t.title || '').toLowerCase().includes(q)
     || (t.description || '').toLowerCase().includes(q);
   });
 }, [tickets, statusFilter, typeFilter, search]);

 const hasFilters = search.trim() || statusFilter !== 'all' || typeFilter !== 'all';

 const clearFilters = () => {
  setSearch('');
  setStatusFilter('all');
  setTypeFilter('all');
 };

 return (
  <div className="space-y-4">
   <div className="flex items-center justify-between">
    <h2 className="text-base font-semibold text-foreground">הפניות שלי</h2>
    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{filtered.length}</span>
   </div>

   {/* Filters */}
   {tickets.length > 0 && (
    <div className="space-y-2">
     <div className="relative">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
      <Input
       value={search}
       onChange={(e) => setSearch(e.target.value)}
       placeholder="חיפוש לפי כותרת או תיאור..."
       className="h-9 ps-9 text-sm"
      />
     </div>
     <div className="flex items-center gap-1.5 flex-wrap">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
       <SelectTrigger className="h-8 text-xs w-auto gap-1"><SelectValue /></SelectTrigger>
       <SelectContent dir="rtl">
        {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
       </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
       <SelectTrigger className="h-8 text-xs w-auto gap-1"><SelectValue /></SelectTrigger>
       <SelectContent dir="rtl">
        <SelectItem value="all">כל הסוגים</SelectItem>
        {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
       </SelectContent>
      </Select>
      {hasFilters && (
       <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1">
        <X className="w-3 h-3"/> נקה
       </button>
      )}
     </div>
    </div>
   )}

   {isLoading ? (
    <ListSkeleton count={3} />
   ) : filtered.length === 0 ? (
    <EmptyState
     icon={MessageSquare}
     title={hasFilters ? "לא נמצאו פניות": "אין פניות"}
     description={hasFilters ? "נסה לשנות את הסינון": "עדיין לא שלחת פניות תמיכה."}
    />
   ) : (
    <div className="grid grid-cols-1 gap-2">
     {filtered.map(t => {
      const tc = TYPE_CONFIG[t.type] || TYPE_CONFIG.other;
      const Icon = tc.icon;
      return (
       <button
        key={t.id}
        onClick={() => setSelectedTicket(t)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:shadow-sm hover:border-ring/30 transition-all text-right"
       >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
         <Icon className={`w-4 h-4 ${tc.color}`} />
        </div>
        <div className="flex-1 min-w-0 text-right">
         <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
         <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={t.status} />
          {t.created_date && <span className="text-caption">{formatDate(t.created_date, 'medium')}</span>}
         </div>
        </div>
       </button>
      );
     })}
    </div>
   )}

   <TicketConversationModal
    ticket={selectedTicket}
    open={!!selectedTicket}
    onOpenChange={(o) => !o && setSelectedTicket(null)}
   />
  </div>
 );
}
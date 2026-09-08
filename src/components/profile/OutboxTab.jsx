import React, { useState, useMemo } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Mail, CheckCircle2, XCircle, RefreshCw, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/shared/StatusBadge';
import ListSkeleton from '@/components/shared/ListSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import OutboxFilters from '@/components/profile/OutboxFilters';
import { toast } from 'sonner';

const SOURCE_LABELS = {
  test_email: 'בדיקה',
  alert: 'התראה',
  support_ticket: 'פנייה',
  backfill: 'ייבוא רטרו',
  manual: 'ידני',
};

const DEFAULT_FILTERS = { status: 'all', source: 'all', sender: 'all', dateFrom: '', dateTo: '' };

export default function OutboxTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [backfilling, setBackfilling] = useState(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => api.entities.EmailLog.list('-sent_at', 200),
  });

  const senders = useMemo(
    () => [...new Set(emails.map(e => e.sent_by_name).filter(Boolean))].sort(),
    [emails]
  );

  const filtered = emails.filter(e => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !(e.to || '').toLowerCase().includes(q) &&
        !(e.subject || '').toLowerCase().includes(q) &&
        !(e.sent_by_name || '').toLowerCase().includes(q)
      ) return false;
    }
    if (filters.status !== 'all' && e.status !== filters.status) return false;
    if (filters.source !== 'all' && e.source !== filters.source) return false;
    if (filters.sender !== 'all' && e.sent_by_name !== filters.sender) return false;
    if (filters.dateFrom && e.sent_at && new Date(e.sent_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && e.sent_at && new Date(e.sent_at) > new Date(filters.dateTo + 'T23:59:59')) return false;
    return true;
  });

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await api.functions.invoke('backfillEmailLogs', {});
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`יובאו ${res.imported || 0} מיילים (${res.skipped || 0} כבר היו רשומים)`);
        queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      }
    } catch {
      toast.error('שליפת מיילים רטרואקטיביים נכשלה — ייתכן שנדרשת הרשאת קריאה ל-Gmail');
    }
    setBackfilling(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-section-title">מעקב מיילים</h2>
            <p className="text-caption">כל המיילים שנשלחו מהמערכת דרך Gmail</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackfill}
          disabled={backfilling}
          className="gap-1.5"
        >
          {backfilling
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          שלוף מיילים רטרואקטיביים
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי נמען, נושא או שולח..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pe-9"
        />
      </div>

      {/* Filters */}
      <OutboxFilters filters={filters} onChange={setFilters} senders={senders} />

      {/* List */}
      {isLoading ? (
        <ListSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={search ? 'לא נמצאו תוצאות' : 'אין מיילים בדואר היוצא'}
          description={search ? 'נסה חיפוש אחר' : 'המיילים שנשלחים מהמערכת יופיעו כאן'}
        />
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          {filtered.map((email, idx) => (
            <button
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50 ${
                idx > 0 ? 'border-t border-border' : ''
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {email.status === 'sent' ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
              </div>

              {/* Recipient + subject */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{email.to}</span>
                  {email.source && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                      {SOURCE_LABELS[email.source] || email.source}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
              </div>

              {/* Time */}
              <div className="flex-shrink-0 text-left">
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {email.sent_at
                    ? format(new Date(email.sent_at), 'd MMM yyyy, HH:mm', { locale: he })
                    : '—'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!selectedEmail} onOpenChange={(open) => { if (!open) setSelectedEmail(null); }}>
        <SheetContent side="left" dir="rtl" className="w-full sm:max-w-md overflow-y-auto">
          {selectedEmail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-right">{selectedEmail.subject || '(ללא נושא)'}</SheetTitle>
              </SheetHeader>

              <div className="px-4 pt-6 pb-6 space-y-3">
                {/* Metadata */}
                <div className="space-y-0">
                  <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border/60">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">אל</span>
                    <span className="text-sm text-foreground break-all" dir="ltr">{selectedEmail.to}</span>
                  </div>
                  {selectedEmail.sent_by_name && (
                    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border/60">
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">נשלח ע"י</span>
                      <span className="text-sm text-foreground">{selectedEmail.sent_by_name}</span>
                    </div>
                  )}
                  {selectedEmail.sent_at && (
                    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border/60">
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">תאריך</span>
                      <span className="text-sm text-foreground">
                        {format(new Date(selectedEmail.sent_at), "d MMM yyyy, HH:mm", { locale: he })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/60">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">סטטוס</span>
                    <StatusBadge status={selectedEmail.status} />
                  </div>
                  {selectedEmail.source && (
                    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border/60">
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">מקור</span>
                      <span className="text-sm text-foreground">{SOURCE_LABELS[selectedEmail.source] || selectedEmail.source}</span>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {selectedEmail.status === 'failed' && selectedEmail.error_message && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                    <p className="text-xs text-destructive font-medium">שגיאת שליחה</p>
                    <p className="text-xs text-destructive mt-1 break-words">{selectedEmail.error_message}</p>
                  </div>
                )}

                {/* Gmail message ID */}
                {selectedEmail.gmail_message_id && (
                  <p className="text-[10px] text-muted-foreground font-mono text-left" dir="ltr">
                    Gmail ID: {selectedEmail.gmail_message_id}
                  </p>
                )}

                {/* Body */}
                <div className="border-t border-border pt-3">
                  {selectedEmail.html ? (
                    <div
                      className="prose prose-sm max-w-none text-foreground"
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedEmail.html) }}
                    />
                  ) : selectedEmail.body ? (
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans" dir="rtl">
                      {selectedEmail.body}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">אין תוכן להצגה</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ScrollText, Search } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';
import TableSkeleton from '@/components/shared/TableSkeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatDate';
import {
  AUDIT_ENTITY, AUDIT_AREAS, areaMeta, sortAudit, matchesAudit, auditToCsv,
} from '@/lib/auditLog';

// ─────────────────────────────────────────────────────────────────────────────
// The screen that reads the audit log back. Without it the log is a table
// nobody can see, which is the same as no log at all.
// ─────────────────────────────────────────────────────────────────────────────

export default function AuditLogPanel() {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api.entities[AUDIT_ENTITY].list('-created_date'),
  });

  const visible = useMemo(() => sortAudit(rows)
    .filter((r) => area === 'all' || r.area === area)
    .filter((r) => matchesAudit(r, query)), [rows, area, query]);

  const download = () => {
    const blob = new Blob([auditToCsv(visible)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `יומן-פעולות-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${visible.length} שורות יוצאו`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי פעולה, מי ביצע או על מה"
            className="ps-9 h-9 rounded-lg"
            aria-label="חיפוש ביומן"
          />
        </div>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="h-9 w-full sm:w-52 rounded-lg" aria-label="סינון לפי תחום">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל התחומים</SelectItem>
            {AUDIT_AREAS.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline" size="sm" className="h-9 gap-1.5"
          onClick={download} disabled={visible.length === 0}
        >
          <Download className="w-3.5 h-3.5" /> ייצוא CSV
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={rows.length === 0 ? 'היומן ריק' : 'אין שורות שתואמות את הסינון'}
          description={rows.length === 0
            ? 'כל שינוי בהרשאות, ביכולות, במיתוג ובייצוא יירשם כאן אוטומטית.'
            : 'נסו מונח אחר או תחום אחר.'}
        />
      ) : (
        <>
          {/* Table on a wide screen */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-start">
                  <th className="text-start font-semibold px-3 py-2.5 w-40">מתי</th>
                  <th className="text-start font-semibold px-3 py-2.5 w-36">מי</th>
                  <th className="text-start font-semibold px-3 py-2.5 w-36">תחום</th>
                  <th className="text-start font-semibold px-3 py-2.5">מה נעשה</th>
                  <th className="text-start font-semibold px-3 py-2.5 w-56">שינוי</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatDate(row.created_date, 'datetime')}
                    </td>
                    <td className="px-3 py-2 truncate">{row.actor_name || row.actor_email || '—'}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={areaMeta(row.area).tone} label={areaMeta(row.area).label} />
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{row.action}</span>
                      {row.target && <span className="text-muted-foreground"> · {row.target}</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground truncate">
                      {row.before || row.after ? `${row.before || '—'} ← ${row.after || '—'}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on a phone — the same lines, stacked */}
          <div className="md:hidden space-y-2">
            {visible.map((row) => (
              <div key={row.id} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm">{row.action}</span>
                  <StatusBadge tone={areaMeta(row.area).tone} label={areaMeta(row.area).label} />
                </div>
                {row.target && <p className="text-xs text-muted-foreground">{row.target}</p>}
                {(row.before || row.after) && (
                  <p className="text-xs text-muted-foreground">{row.before || '—'} ← {row.after || '—'}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {row.actor_name || row.actor_email || '—'} · {formatDate(row.created_date, 'datetime')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

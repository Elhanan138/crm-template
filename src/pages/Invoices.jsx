import React, { useMemo } from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { currency } from '@/lib/crm/useCrmRecords';

const daysBetween = (a, b) => Math.floor((a - b) / 86400000);

const BUCKETS = [
  { key: 'current', label: 'בתוקף', max: 0 },
  { key: 'd30', label: '1–30 יום', max: 30 },
  { key: 'd60', label: '31–60 יום', max: 60 },
  { key: 'd90', label: '61–90 יום', max: 90 },
  { key: 'over', label: '90+ יום', max: Infinity },
];

function Aging({ records }) {
  const summary = useMemo(() => {
    const today = new Date();
    const open = records.filter((r) => !['paid', 'void'].includes(r.status));
    const totals = Object.fromEntries(BUCKETS.map((b) => [b.key, 0]));
    let outstanding = 0;
    open.forEach((inv) => {
      const due = Number(inv.amount || 0) - Number(inv.paid_amount || 0);
      if (due <= 0) return;
      outstanding += due;
      const overdue = inv.due_date ? daysBetween(today, new Date(inv.due_date)) : 0;
      const bucket = BUCKETS.find((b) => overdue <= b.max) || BUCKETS[BUCKETS.length - 1];
      totals[bucket.key] += due;
    });
    return { totals, outstanding, count: open.length };
  }, [records]);

  if (summary.count === 0) return null;

  return (
    <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <div className="bg-card border border-border rounded-xl p-3">
        <p className="text-[10px] text-muted-foreground">יתרה פתוחה</p>
        <p className="text-base font-bold text-primary" dir="ltr">{currency(summary.outstanding)}</p>
      </div>
      {BUCKETS.map((b) => (
        <div key={b.key} className="bg-muted/40 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground">{b.label}</p>
          <p className="text-sm font-semibold" dir="ltr">{currency(summary.totals[b.key])}</p>
        </div>
      ))}
    </div>
  );
}

export default function Invoices() {
  return <CrmModulePage schema={CRM_SCHEMAS.invoices} moduleId="invoices" stats={false} renderAbove={(p) => <Aging {...p} />} />;
}

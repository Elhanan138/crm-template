import React, { useMemo } from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { StatStrip } from '@/components/crm/BoardView';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { BILLING_CYCLES } from '@/lib/crm/sectorSchemas';
import { currency } from '@/lib/crm/useCrmRecords';

const monthsOf = (cycle) => BILLING_CYCLES.find((c) => c.value === cycle)?.months || 1;

function RecurringSummary({ records }) {
  const stats = useMemo(() => {
    const live = records.filter((r) => ['active', 'trial', 'past_due'].includes(r.status));
    // Everything is normalised to a monthly figure before it is summed.
    const mrr = live.reduce((s, r) => s + Number(r.amount || 0) / monthsOf(r.billing_cycle), 0);
    const churned = records.filter((r) => r.status === 'churned').length;
    const churnRate = records.length ? (churned / records.length) * 100 : 0;
    return [
      { label: 'MRR', value: currency(Math.round(mrr)), accent: true },
      { label: 'ARR', value: currency(Math.round(mrr * 12)) },
      { label: 'מנויים פעילים', value: live.length.toLocaleString() },
      { label: 'שיעור נטישה', value: `${churnRate.toFixed(1)}%`, alert: churnRate > 10 },
    ];
  }, [records]);

  if (records.length === 0) return null;
  return <StatStrip stats={stats} />;
}

export default function Subscriptions() {
  return <CrmModulePage schema={CRM_SCHEMAS.subscriptions} moduleId="subscriptions" renderAbove={(p) => <RecurringSummary {...p} />} />;
}

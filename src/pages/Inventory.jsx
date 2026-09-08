import React, { useMemo } from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { StatStrip } from '@/components/crm/BoardView';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { currency } from '@/lib/crm/useCrmRecords';

function StockSummary({ records }) {
  const stats = useMemo(() => {
    const active = records.filter((r) => r.active !== false);
    const low = active.filter(
      (r) => r.reorder_point && Number(r.quantity || 0) <= Number(r.reorder_point)
    );
    const out = active.filter((r) => Number(r.quantity || 0) <= 0);
    const value = active.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_cost || 0), 0);
    return [
      { label: 'פריטים פעילים', value: active.length.toLocaleString() },
      { label: 'שווי מלאי', value: currency(value), accent: true },
      { label: 'מתחת לנקודת הזמנה', value: low.length.toLocaleString(), alert: low.length > 0 },
      { label: 'אזל', value: out.length.toLocaleString(), alert: out.length > 0 },
    ];
  }, [records]);

  if (records.length === 0) return null;
  return <StatStrip stats={stats} />;
}

export default function Inventory() {
  return <CrmModulePage schema={CRM_SCHEMAS.inventory} moduleId="inventory" renderAbove={(p) => <StockSummary {...p} />} />;
}

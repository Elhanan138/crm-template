import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS, LEAD_STAGES, stageMeta, TONE_CLASS } from '@/lib/crm/schemas';
import { currency } from '@/lib/crm/useCrmRecords';

function PipelineBoard({ records, lookups, openRecord }) {
  const columns = useMemo(
    () => LEAD_STAGES.map((stage) => {
      const items = records.filter((r) => r.stage === stage.value);
      return { stage, items, total: items.reduce((s, r) => s + Number(r.value || 0), 0) };
    }),
    [records]
  );

  return (
    // Horizontal board on desktop, stacked accordion-free columns on mobile.
    <div className="mb-5 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
      <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {columns.map(({ stage, items, total }) => (
          <div key={stage.value} className="w-56 sm:w-auto flex flex-col bg-muted/30 rounded-xl p-2.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TONE_CLASS[stage.tone]}`}>
                {stage.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
            </div>
            <p className="text-xs font-bold mb-2" dir="ltr">{currency(total)}</p>
            <div className="space-y-1.5">
              {items.slice(0, 6).map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => openRecord(lead)}
                  className="w-full text-right bg-card border border-border rounded-lg px-2.5 py-2 hover:border-primary/30 transition-colors"
                >
                  <p className="text-xs font-medium truncate">{lead.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {lookups.company?.[lead.company] || lead.contact_name || '—'}
                  </p>
                  {lead.value ? <p className="text-[10px] font-semibold mt-0.5" dir="ltr">{currency(lead.value)}</p> : null}
                </button>
              ))}
              {items.length > 6 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">ועוד {items.length - 6}</p>
              )}
              {items.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">ריק</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Leads() {
  const [view, setView] = useState('board');
  return (
    <CrmModulePage
      schema={CRM_SCHEMAS.leads} moduleId="leads"
      extraActions={
        <div className="flex bg-muted/50 rounded-full p-0.5">
          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${view === 'board' ? 'bg-card shadow-sm' : ''}`}
            onClick={() => setView('board')} aria-label="תצוגת צנרת"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${view === 'list' ? 'bg-card shadow-sm' : ''}`}
            onClick={() => setView('list')} aria-label="תצוגת רשימה"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      }
      renderAbove={view === 'board' ? (props) => <PipelineBoard {...props} /> : undefined}
    />
  );
}
export { stageMeta };

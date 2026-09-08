import React, { useMemo } from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

const LEVELS = [1, 2, 3, 4, 5];

// Standard 5×5 register colouring: score = likelihood × impact.
const cellTone = (score) => {
  if (score >= 15) return 'bg-destructive/80 text-destructive-foreground';
  if (score >= 8) return 'bg-warning/70 text-foreground';
  if (score >= 4) return 'bg-warning/25 text-foreground';
  return 'bg-success/20 text-foreground';
};

function HeatMatrix({ records, openRecord }) {
  const open = useMemo(() => records.filter((r) => r.status !== 'closed'), [records]);

  const grid = useMemo(() => {
    const map = {};
    for (const risk of open) {
      const key = `${Number(risk.likelihood || 3)}:${Number(risk.impact || 3)}`;
      (map[key] ||= []).push(risk);
    }
    return map;
  }, [open]);

  if (records.length === 0) return null;

  return (
    <div className="mb-5 bg-card border border-border rounded-xl p-4 overflow-x-auto">
      <p className="text-xs font-semibold text-muted-foreground mb-3">
        מפת חום — הסתברות מול השפעה ({open.length} סיכונים פתוחים)
      </p>
      <div className="flex gap-2 min-w-[340px]">
        <div className="flex flex-col justify-around text-[10px] text-muted-foreground pt-0 pb-5">
          {[...LEVELS].reverse().map((l) => <span key={l} className="h-9 flex items-center">{l}</span>)}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {[...LEVELS].reverse().map((likelihood) =>
              LEVELS.map((impact) => {
                const items = grid[`${likelihood}:${impact}`] || [];
                return (
                  <button
                    key={`${likelihood}-${impact}`}
                    onClick={() => items[0] && openRecord(items[0])}
                    disabled={items.length === 0}
                    title={items.map((r) => r.title).join('\n')}
                    className={`h-9 rounded-md text-xs font-bold transition-opacity ${cellTone(likelihood * impact)} ${
                      items.length ? 'hover:opacity-80 cursor-pointer' : 'opacity-30 cursor-default'
                    }`}
                  >
                    {items.length || ''}
                  </button>
                );
              })
            )}
          </div>
          <div className="grid grid-cols-5 gap-1 mt-1 text-[10px] text-muted-foreground text-center">
            {LEVELS.map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>הסתברות ↑</span>
        <span>השפעה ←</span>
      </div>
    </div>
  );
}

export default function Risks() {
  return <CrmModulePage schema={CRM_SCHEMAS.risks} moduleId="risks" renderAbove={(p) => <HeatMatrix {...p} />} />;
}

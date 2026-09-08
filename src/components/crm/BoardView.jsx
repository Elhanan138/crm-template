import React, { useMemo } from 'react';
import { TONE_CLASS } from '@/lib/crm/schemas';
import { readField } from '@/lib/crm/derived';

/**
 * Reusable stage board. Any schema that declares `boardField` + `boardStages`
 * gets a pipeline view without writing one — horizontal scroll on mobile,
 * a responsive grid from `sm` up.
 */
// NOTE: never name a prop `valueOf`, `toString`, `hasOwnProperty` or any other
// Object.prototype member. Destructuring falls back to the inherited built-in
// instead of undefined, so an "optional" prop silently becomes a function that
// throws when called. That is exactly what broke /recruiting.
export default function BoardView({
  schema, records = [], openRecord, subtitleOf, amountOf, formatValue = String,
}) {
  const stages = schema?.boardStages || [];
  const columns = useMemo(
    () => stages.map((stage) => {
      const boardField = (schema.fields || []).find((f) => f.key === schema.boardField) || { key: schema.boardField };
      const items = records.filter((r) => String(readField(boardField, r)) === String(stage.value));
      const total = amountOf ? items.reduce((s, r) => s + Number(amountOf(r) || 0), 0) : null;
      return { stage, items, total };
    }),
    [records, schema, stages, amountOf]
  );

  if (stages.length === 0) return null;

  return (
    <div className="mb-5 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
      <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {columns.map(({ stage, items, total }) => (
          <div key={stage.value} className="w-56 sm:w-auto flex flex-col bg-muted/30 rounded-xl p-2.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TONE_CLASS[stage.tone] || TONE_CLASS.muted}`}>
                {stage.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
            </div>
            {total !== null && total > 0 && (
              <p className="text-xs font-bold mb-2" dir="ltr">{formatValue(total)}</p>
            )}
            <div className="space-y-1.5">
              {items.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  onClick={() => openRecord(item)}
                  className="w-full text-start bg-card border border-border rounded-lg px-2.5 py-2 hover:border-primary/30 transition-colors"
                >
                  <p className="text-xs font-medium truncate">{item[schema.titleField]}</p>
                  {subtitleOf && (
                    <p className="text-[10px] text-muted-foreground truncate">{subtitleOf(item) || '—'}</p>
                  )}
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

/** Compact KPI strip used above several sector lists. */
export function StatStrip({ stats }) {
  return (
    <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl p-3 border ${s.alert ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}`}
        >
          <p className="text-[10px] text-muted-foreground">{s.label}</p>
          <p className={`text-base font-bold ${s.alert ? 'text-destructive' : s.accent ? 'text-primary' : ''}`} dir="ltr">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

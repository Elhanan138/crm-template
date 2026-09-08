import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import CardSkeleton from '@/components/shared/CardSkeleton';
import { FORECAST_META, LEAD_STAGES, OPEN_STAGES, stageMeta, TONE_CLASS } from '@/lib/crm/schemas';
import { currency } from '@/lib/crm/useCrmRecords';

const PERIODS = [
  { value: 'q', label: 'רבעון נוכחי', months: 3 },
  { value: 'h', label: 'חצי שנה', months: 6 },
  { value: 'y', label: 'שנה', months: 12 },
  { value: 'all', label: 'כל הצנרת', months: null },
];

export default function Forecast() {
  const [period, setPeriod] = useState('q');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm', 'Lead'],
    queryFn: () => api.entities.Lead.list('-created_date'),
  });

  const model = useMemo(() => {
    const months = PERIODS.find((p) => p.value === period)?.months;
    const cutoff = months ? new Date(Date.now() + months * 30 * 86400000) : null;

    const inScope = leads.filter((l) => {
      if (!OPEN_STAGES.some((s) => s.value === l.stage)) return false;
      if (!cutoff) return true;
      if (!l.expected_close) return true;
      return new Date(l.expected_close) <= cutoff;
    });

    const byStage = OPEN_STAGES.map((stage) => {
      const items = inScope.filter((l) => l.stage === stage.value);
      const gross = items.reduce((s, l) => s + Number(l.value || 0), 0);
      return { stage, count: items.length, gross, weighted: (gross * stage.probability) / 100 };
    });

    const won = leads
      .filter((l) => l.stage === 'won')
      .reduce((s, l) => s + Number(l.value || 0), 0);

    return {
      byStage,
      gross: byStage.reduce((s, r) => s + r.gross, 0),
      weighted: byStage.reduce((s, r) => s + r.weighted, 0),
      count: inScope.length,
      won,
    };
  }, [leads, period]);

  const maxGross = Math.max(...model.byStage.map((r) => r.gross), 1);

  return (
    <div dir="rtl" className="pb-10">
      <PageHeader
        icon={FORECAST_META.icon}
        title={FORECAST_META.title}
        subtitle={FORECAST_META.subtitle}
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 rounded-lg text-sm w-40"><SelectValue /></SelectTrigger>
            <SelectContent dir="rtl">
              {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <CardSkeleton count={3} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={FORECAST_META.icon}
          title="אין עדיין נתוני צנרת"
          description="התחזית נגזרת מהלידים הפתוחים. הוסף לידים כדי לראות אותה."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'צנרת ברוטו', value: currency(model.gross), accent: false },
              { label: 'תחזית משוקללת', value: currency(model.weighted), accent: true },
              { label: 'הזדמנויות פתוחות', value: model.count.toLocaleString(), accent: false },
              { label: 'נסגר בהצלחה (מצטבר)', value: currency(model.won), accent: false },
            ].map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground">{card.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${card.accent ? 'text-primary' : ''}`} dir="ltr">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">פילוח לפי שלב</p>
            <div className="space-y-3">
              {model.byStage.map(({ stage, count, gross, weighted }) => (
                <div key={stage.value}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${TONE_CLASS[stage.tone]}`}>
                        {stage.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {count} · {stage.probability}%
                      </span>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <span className="text-xs font-bold" dir="ltr">{currency(weighted)}</span>
                      <span className="text-[10px] text-muted-foreground mr-1.5" dir="ltr">{currency(gross)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.round((gross / maxGross) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              המשוקלל = שווי ההזדמנות × הסתברות השלב. שלבים סגורים אינם נכללים בצנרת.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export { LEAD_STAGES, stageMeta };

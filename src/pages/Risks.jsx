import React, { useMemo, useState } from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { bandOfScore, num } from '@/lib/crm/derived';
import { surfaceFor } from '@/lib/tones';
import { useI18n } from '@/lib/i18n';

const LEVELS = [1, 2, 3, 4, 5];

// The two readings of the same register. Inherent is the risk as it stands
// with nothing done; residual is what is left after the treatment. Laid side
// by side, the matrix answers whether the mitigation is working at all.
const READINGS = [
  { id: 'inherent', label: 'לפני טיפול', likelihood: 'likelihood', impact: 'impact' },
  { id: 'residual', label: 'אחרי טיפול', likelihood: 'residual_likelihood', impact: 'residual_impact' },
];

/**
 * The 5×5 matrix, coloured by the SAME bands the score column declares.
 *
 * It used to colour cells by thresholds of its own (15 / 8 / 4) while the
 * `risk_band` column used 14 / 9 / 4 — so a score of 9 was "medium" in the
 * column and "high" in the matrix above it. Now both read RISK_BANDS.
 */
function HeatMatrix({ records, focus, setFocus }) {
  const { t, isRtl } = useI18n();
  const [readingId, setReadingId] = useState('inherent');
  const reading = READINGS.find((r) => r.id === readingId);

  const open = useMemo(() => records.filter((r) => r.status !== 'closed'), [records]);
  const assessed = useMemo(
    () => open.filter((r) => num(r[reading.likelihood]) && num(r[reading.impact])),
    [open, reading]
  );

  const grid = useMemo(() => {
    const map = {};
    for (const risk of assessed) {
      (map[`${num(risk[reading.likelihood])}:${num(risk[reading.impact])}`] ||= []).push(risk);
    }
    return map;
  }, [assessed, reading]);

  if (records.length === 0) return null;

  const unassessed = open.length - assessed.length;

  return (
    <div className="mb-5 bg-card border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-muted-foreground">
          {t('מפת חום — הסתברות מול השפעה')} · {assessed.length} {t('סיכונים פתוחים')}
        </p>
        <div className="flex bg-muted/50 rounded-full p-0.5">
          {READINGS.map((r) => (
            <button
              key={r.id}
              onClick={() => { setReadingId(r.id); setFocus?.(null); }}
              aria-pressed={readingId === r.id}
              className={`h-7 px-3 rounded-full text-xs transition-colors ${
                readingId === r.id ? 'bg-card shadow-sm font-semibold' : 'text-muted-foreground'
              }`}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-[300px]">
          <div className="flex flex-col justify-around text-[10px] text-muted-foreground pb-5">
            {[...LEVELS].reverse().map((l) => <span key={l} className="h-9 flex items-center">{l}</span>)}
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-5 gap-1">
              {[...LEVELS].reverse().map((likelihood) =>
                LEVELS.map((impact) => {
                  const items = grid[`${likelihood}:${impact}`] || [];
                  const band = bandOfScore(likelihood * impact);
                  const id = `risk:${reading.id}:${likelihood}:${impact}`;
                  const active = focus?.id === id;
                  return (
                    <button
                      key={id}
                      // Pressing a cell narrows the register to the risks in it.
                      // It used to open only the FIRST of them and say nothing
                      // about the rest.
                      onClick={() => setFocus?.(active ? null : {
                        id,
                        label: `${t(reading.label)} — ${likelihood}×${impact}`,
                        test: (r) => r.status !== 'closed'
                          && num(r[reading.likelihood]) === likelihood
                          && num(r[reading.impact]) === impact,
                      })}
                      disabled={items.length === 0}
                      aria-pressed={active}
                      title={items.map((r) => r.title).join('\n') || t(band.label)}
                      className={`h-9 rounded-md text-xs font-bold transition-all ${surfaceFor(band.tone)} ${
                        items.length ? 'hover:ring-2 hover:ring-primary/30' : 'opacity-30 cursor-default'
                      } ${active ? 'ring-2 ring-primary/30' : ''}`}
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
      </div>

      <div className="flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground mt-1">
        <span>{t('הסתברות')} ↑ · {t('השפעה')} {isRtl ? '←' : '→'}</span>
        {unassessed > 0 && (
          <span>{unassessed} {t('עדיין לא הוערכו')}</span>
        )}
      </div>
    </div>
  );
}

export default function Risks() {
  return <CrmModulePage schema={CRM_SCHEMAS.risks} moduleId="risks" renderAbove={(p) => <HeatMatrix {...p} />} />;
}

import React, { useMemo, useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { competencyMatrix, cellState, cellMeta } from '@/lib/crm/competency';
import { surfaceFor, textFor, toneForNumber } from '@/lib/tones';
import { useI18n } from '@/lib/i18n';

/**
 * People × courses. An enrolment list answers "what is Dana doing"; the
 * question a manager or an auditor brings is the other axis — for this
 * mandatory course, who is covered, and is this person fully qualified yet.
 */
function CompetencyMatrix({ records, openRecord }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const matrix = useMemo(() => competencyMatrix(records), [records]);

  if (matrix.people.length === 0) return null;

  // Coverage is read for colour as what it means: low is the problem.
  const coverageTone = (pct) => (pct === null ? 'neutral' : pct < 50 ? 'destructive' : pct < 100 ? 'warning' : 'success');

  return (
    <div className="mb-4 bg-card border border-border rounded-xl">
      <button
        onClick={() => setShown((s) => !s)}
        aria-expanded={shown}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-start"
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold">
          <Grid3x3 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {t('מטריצת כשירות')}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {matrix.people.length} × {matrix.courses.length} · {shown ? t('הסתר') : t('הצג')}
        </span>
      </button>

      {shown && (
        <div className="overflow-x-auto px-3 pb-3">
          <table className="text-xs border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-start font-semibold text-muted-foreground px-1 sticky start-0 bg-card">{t('משתתף')}</th>
                {matrix.courses.map((course) => {
                  const pct = matrix.coverage(course);
                  return (
                    <th key={course} className="font-medium text-muted-foreground px-1 min-w-[84px] align-bottom">
                      <span className="block truncate max-w-[110px]" title={course}>{course}</span>
                      {matrix.mandatory.has(course) && <span className="block text-[9px] font-semibold">{t('חובה')}</span>}
                      {pct !== null && <span className={`block tabular-nums ${textFor(coverageTone(pct))}`} dir="ltr">{pct}%</span>}
                    </th>
                  );
                })}
                <th className="font-semibold text-muted-foreground px-1">{t('מוכנות')}</th>
              </tr>
            </thead>
            <tbody>
              {matrix.people.map((person) => {
                const ready = matrix.readiness(person);
                return (
                  <tr key={person}>
                    <td className="font-medium px-1 whitespace-nowrap sticky start-0 bg-card">{person}</td>
                    {matrix.courses.map((course) => {
                      const enrollment = matrix.cell(person, course);
                      const meta = cellMeta(cellState(enrollment));
                      return (
                        <td key={course} className="p-0">
                          <button
                            disabled={!enrollment}
                            onClick={() => enrollment && openRecord(enrollment)}
                            title={`${person} · ${course} · ${t(meta.label)}`}
                            className={`w-full h-7 rounded-md text-[10px] font-semibold ${
                              enrollment ? `${surfaceFor(meta.tone)} hover:ring-2 hover:ring-primary/30` : 'bg-muted/40 text-muted-foreground cursor-default'
                            }`}
                          >
                            {enrollment ? t(meta.label) : '—'}
                          </button>
                        </td>
                      );
                    })}
                    <td className={`px-1 tabular-nums font-semibold ${textFor(ready === null ? 'neutral' : toneForNumber(100 - ready, { warnAbove: 0, badAbove: 50 }))}`} dir="ltr">
                      {ready === null ? '—' : `${ready}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Training() {
  return <CrmModulePage schema={CRM_SCHEMAS.training} moduleId="training" renderAbove={(p) => <CompetencyMatrix {...p} />} />;
}

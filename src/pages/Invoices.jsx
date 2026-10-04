import React, { useMemo } from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { currency } from '@/lib/crm/useCrmRecords';
import { AGING_BUCKETS, agingSummary, inBucket } from '@/lib/crm/aging';
import { textFor } from '@/lib/tones';
import { useI18n } from '@/lib/i18n';

/**
 * What is owed, and how late.
 *
 * Every figure comes from src/lib/crm/aging.js, which derives it from the same
 * `balance` the table's own column shows — gross of VAT, net of what came in.
 * The strip used to total the pre-VAT amount instead, and reported a smaller
 * debt than the rows beneath it.
 */
function Aging({ records, focus, setFocus }) {
  const { t } = useI18n();
  const summary = useMemo(() => agingSummary(records), [records]);

  if (summary.count === 0) return null;

  return (
    <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <button
        onClick={() => setFocus?.(focus?.id === 'aging:open' ? null : {
          id: 'aging:open',
          label: t('יתרה פתוחה'),
          test: (r) => AGING_BUCKETS.some((b) => inBucket(b.key)(r)),
        })}
        aria-pressed={focus?.id === 'aging:open'}
        className={`text-start bg-card border rounded-xl p-3 transition-colors hover:border-primary/30 ${
          focus?.id === 'aging:open' ? 'border-primary/30 bg-accent' : 'border-border'
        }`}
      >
        <p className="text-[10px] text-muted-foreground">{t('יתרה פתוחה')}</p>
        <p className="text-base font-bold text-primary" dir="ltr">{currency(summary.outstanding)}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {summary.count} · <span className={textFor(summary.overdue > 0 ? 'destructive' : 'neutral')} dir="ltr">{currency(summary.overdue)}</span> {t('באיחור')}
        </p>
      </button>

      {AGING_BUCKETS.map((bucket) => {
        const { amount, count } = summary.totals[bucket.key];
        const id = `aging:${bucket.key}`;
        const active = focus?.id === id;
        return (
          <button
            key={bucket.key}
            disabled={count === 0}
            onClick={() => setFocus?.(active ? null : {
              id,
              label: `${t('גיול')} — ${t(bucket.label)}`,
              // The predicate the number was counted with, so the rows that
              // appear are exactly the ones behind the figure that was pressed.
              test: inBucket(bucket.key),
            })}
            aria-pressed={active}
            className={`text-start rounded-xl p-3 border transition-colors ${
              active
                ? 'border-primary/30 bg-accent'
                : 'border-transparent bg-muted/40 enabled:hover:border-primary/30'
            } disabled:opacity-50 disabled:cursor-default`}
          >
            <p className="text-[10px] text-muted-foreground">{t(bucket.label)}</p>
            <p className={`text-sm font-semibold ${amount > 0 ? textFor(bucket.tone) : ''}`} dir="ltr">
              {currency(amount)}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">{count}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function Invoices() {
  return (
    <CrmModulePage
      schema={CRM_SCHEMAS.invoices}
      moduleId="invoices"
      stats={false}
      renderAbove={(p) => <Aging {...p} />}
    />
  );
}

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { currency } from '@/lib/crm/useCrmRecords';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { useRecordViewer, visibleModuleRecords } from '@/lib/crm/visibility';
import {
  productPerformance, performanceSummary, needsReview, priceVerdict,
} from '@/lib/crm/productPerformance';
import { textFor, surfaceFor } from '@/lib/tones';
import { useI18n } from '@/lib/i18n';

// The catalogue only becomes an answer when something has been sold from it.
// Resolved through the manifest rather than imported, so a bundle exported
// without invoices simply renders the plain product list.
const SELLS_PRODUCTS = ACTIVE_MODULE_IDS.includes('invoices');

/**
 * What the catalogue actually sells for.
 *
 * The product page knew the list price and the discount ceiling; the invoices
 * knew what was really charged. docs/VALUE-MAP.md calls this the cheapest
 * combination in the system with the fastest return, and nothing computed it.
 *
 * Deliberately not a second stat strip: the generic one above it already says
 * how many products there are and what they are worth at list. This says the
 * one thing it cannot — which prices are not holding — and says nothing at all
 * when every price is holding.
 */
function Performance({ records, focus, setFocus }) {
  const { t } = useI18n();
  const viewer = useRecordViewer();

  const { data: invoices = [] } = useQuery({
    queryKey: ['crm', 'Invoice'],
    queryFn: () => api.entities.Invoice.list(),
    enabled: SELLS_PRODUCTS,
    staleTime: 30000,
  });

  // Rows the viewer may read. Deriving a figure from invoices they cannot open
  // would leak the amounts back out through the total.
  const readable = useMemo(
    () => visibleModuleRecords('invoices', invoices, viewer, CRM_SCHEMAS),
    [invoices, viewer]
  );

  const rows = useMemo(() => productPerformance(records, readable), [records, readable]);
  const summary = useMemo(() => performanceSummary(rows), [rows]);
  const flagged = useMemo(() => rows.filter(needsReview), [rows]);

  if (!SELLS_PRODUCTS || flagged.length === 0) return null;

  const focusId = 'products:review';
  const active = focus?.id === focusId;
  const flaggedIds = new Set(flagged.map((r) => r.id));

  return (
    <div className="mb-4 bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-muted/40 border-b border-border">
        <div className="min-w-0">
          <p className="text-xs font-semibold">{t('מחירון שלא מחזיק')}</p>
          <p className="text-[10px] text-muted-foreground">
            {summary.sold} {t('נמכרו מהקטלוג')} · <span dir="ltr">{currency(summary.revenue)}</span>
          </p>
        </div>
        <button
          onClick={() => setFocus?.(active ? null : {
            id: focusId,
            label: t('מחירון שדורש בדיקה'),
            test: (product) => flaggedIds.has(product.id),
          })}
          aria-pressed={active}
          className={`flex-shrink-0 text-xs rounded-full border px-3 h-7 transition-colors ${
            active
              ? 'border-primary/30 bg-accent font-semibold'
              : 'border-border hover:border-primary/30 text-muted-foreground'
          }`}
        >
          {active ? t('בטל סינון') : `${t('סנן לרשימה')} (${flagged.length})`}
        </button>
      </div>

      <ul className="divide-y divide-border">
        {flagged.slice(0, 6).map((row) => {
          const verdict = priceVerdict(row);
          return (
            <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
              <span className="text-sm font-medium min-w-0 truncate flex-1">{row.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${surfaceFor(verdict.tone)}`}>
                {t(verdict.label)}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                {t('הנחה בפועל')} <span dir="ltr">{row.avgDiscount}%</span>
                {row.maxDiscount > 0 && <> / <span dir="ltr">{row.maxDiscount}%</span></>}
              </span>
              {row.marginPercent !== null && (
                <span
                  className={`text-[11px] tabular-nums flex-shrink-0 ${textFor(row.marginPercent < 0 ? 'destructive' : 'neutral')}`}
                  dir="ltr"
                  title={t('מרווח בפועל')}
                >
                  {row.marginPercent}%
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="px-3.5 py-2 text-[10px] text-muted-foreground border-t border-border">
        {t('מחושב משורות החשבוניות — המרווח הוא מה שנגבה בפועל פחות העלות שבקטלוג.')}
      </p>
    </div>
  );
}

export default function Products() {
  return (
    <CrmModulePage
      schema={CRM_SCHEMAS.products}
      moduleId="products"
      renderAbove={(p) => <Performance {...p} />}
    />
  );
}

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Search, AlertTriangle, PackageSearch } from 'lucide-react';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import {
  emptyLine, lineTotal, lineTotals, lineFromProduct, discountBreach, catalogAvailable,
} from '@/lib/crm/lineItems';

// ─────────────────────────────────────────────────────────────────────────────
// The lines of a document, edited in place.
//
// Picking from the catalogue is the fast path; typing a free line is always
// available, because the thing being sold is not always in the catalogue and a
// form that refuses the sale is worse than one that allows a typo.
// ─────────────────────────────────────────────────────────────────────────────

const money = (n) => `₪${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
const CELL = 'h-8 rounded-lg text-xs';

function CatalogPicker({ source, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const schema = CRM_SCHEMAS[source.catalog];

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['line-catalog', source.catalog],
    queryFn: () => api.entities[schema.entity].list(schema.defaultSort),
    // Only fetched once the picker is actually opened — a form that is never
    // used should not pull the whole catalogue.
    enabled: open,
    staleTime: 60_000,
  });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      // An item marked inactive is out of the catalogue, not out of history:
      // existing lines keep it, new lines cannot pick it.
      .filter((p) => p.active !== false)
      .filter((p) => !q || (schema.searchFields || ['name'])
        .some((key) => String(p[key] || '').toLowerCase().includes(q)))
      .slice(0, 30);
  }, [products, query, schema.searchFields]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <PackageSearch className="w-3.5 h-3.5" /> מהקטלוג
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="relative mb-2">
          <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={`חיפוש ב${schema.title}`} className="ps-8 h-8 rounded-lg text-xs"
            aria-label="חיפוש בקטלוג"
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {isLoading && <p className="text-xs text-muted-foreground px-2 py-3">טוען…</p>}
          {!isLoading && matches.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-3">
              {products.length === 0 ? 'הקטלוג ריק — אפשר להוסיף שורה חופשית' : 'אין פריט שתואם'}
            </p>
          )}
          {matches.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => { onPick(product); setOpen(false); setQuery(''); }}
              className="w-full text-start px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="text-xs font-medium block truncate">{product.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {product.sku ? `${product.sku} · ` : ''}
                {money(product[source.priceField])}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function LineItemsEditor({ source, value, onChange, vatPercent = 0, readOnly = false }) {
  const lines = Array.isArray(value) ? value : [];
  const hasCatalog = catalogAvailable(source);
  const schema = hasCatalog ? CRM_SCHEMAS[source.catalog] : null;

  // Loaded only to check discount ceilings against the catalogue. Its absence
  // simply means no ceiling is enforced, never an error.
  const { data: products = [] } = useQuery({
    queryKey: ['line-catalog', source.catalog],
    queryFn: () => api.entities[schema.entity].list(schema.defaultSort),
    enabled: hasCatalog && lines.some((l) => l.product_id),
    staleTime: 60_000,
  });

  const totals = lineTotals(lines, vatPercent);

  const update = (index, patch) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const add = (line) => onChange([...lines, line || emptyLine()]);
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));

  const breachOf = (line) =>
    discountBreach(line, products.find((p) => p.id === line.product_id));

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-muted-foreground">{source.label}</Label>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            {hasCatalog && <CatalogPicker source={source} onPick={(p) => add(lineFromProduct(p, source))} />}
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => add()}>
              <Plus className="w-3.5 h-3.5" /> שורה
            </Button>
          </div>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-[11px] text-muted-foreground border border-dashed border-border rounded-lg px-3 py-4 text-center">
          אין שורות. {hasCatalog ? 'בחרו מהקטלוג או הוסיפו שורה חופשית.' : 'הוסיפו שורה כדי לפרט מה נכלל.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {/* Column names, once, above the rows */}
          <div className="hidden sm:grid grid-cols-12 gap-1.5 px-1 text-[10px] text-muted-foreground">
            <span className="col-span-5">פירוט</span>
            <span className="col-span-2">כמות</span>
            <span className="col-span-2">מחיר</span>
            <span className="col-span-1">הנחה%</span>
            <span className="col-span-2 text-end">סה"כ</span>
          </div>
          {lines.map((line, i) => {
            const breach = breachOf(line);
            return (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-1.5 items-center">
                <Input
                  className={`${CELL} col-span-2 sm:col-span-5`} value={line.name || ''} readOnly={readOnly}
                  onChange={(e) => update(i, { name: e.target.value, product_id: '' })}
                  placeholder="מה נכלל" aria-label={`פירוט שורה ${i + 1}`}
                />
                <Input
                  className={`${CELL} sm:col-span-2`} type="number" dir="ltr" min="0" readOnly={readOnly}
                  value={line.quantity ?? ''} onChange={(e) => update(i, { quantity: e.target.value })}
                  aria-label={`כמות שורה ${i + 1}`}
                />
                <Input
                  className={`${CELL} sm:col-span-2`} type="number" dir="ltr" min="0" readOnly={readOnly}
                  value={line.unit_price ?? ''} onChange={(e) => update(i, { unit_price: e.target.value })}
                  aria-label={`מחיר שורה ${i + 1}`}
                />
                <Input
                  className={`${CELL} sm:col-span-1 ${breach ? 'border-warning' : ''}`} type="number" dir="ltr"
                  min="0" max="100" readOnly={readOnly}
                  value={line.discount_percent ?? ''} onChange={(e) => update(i, { discount_percent: e.target.value })}
                  aria-label={`הנחה שורה ${i + 1}`}
                  title={breach ? `ההנחה המרבית למוצר הזה היא ${breach.max}%` : undefined}
                />
                <div className="sm:col-span-2 flex items-center justify-end gap-1">
                  <span className="text-xs font-semibold tabular-nums" dir="ltr">{money(lineTotal(line))}</span>
                  {!readOnly && (
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                      onClick={() => remove(i)} aria-label={`מחיקת שורה ${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {breach && (
                  <p className="col-span-2 sm:col-span-12 text-[11px] text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    הנחה של {breach.asked}% חורגת מהמרבית שהוגדרה למוצר ({breach.max}%)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex flex-col items-end gap-0.5 pt-2 border-t border-border text-xs">
          <div className="flex gap-6">
            <span className="text-muted-foreground">סכום ביניים</span>
            <span className="tabular-nums w-24 text-end" dir="ltr">{money(totals.subtotal)}</span>
          </div>
          {vatPercent > 0 && (
            <div className="flex gap-6">
              <span className="text-muted-foreground">מע"מ {vatPercent}%</span>
              <span className="tabular-nums w-24 text-end" dir="ltr">{money(totals.vat)}</span>
            </div>
          )}
          <div className="flex gap-6 font-bold">
            <span>סה"כ</span>
            <span className="tabular-nums w-24 text-end" dir="ltr">{money(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

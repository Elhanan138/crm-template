import { CRM_SCHEMAS } from '@/lib/crm/schemas';

// ─────────────────────────────────────────────────────────────────────────────
// LINE ITEMS
//
// An invoice for "45,000" tells you nothing a month later. What was sold, at
// what price, with what discount, is the part anyone actually asks about — and
// it was being typed into a single amount field.
//
// A line is: what it is, how many, at what price, less what discount. Every
// total in the system is computed from those four, never stored and trusted,
// because a stored total that disagrees with its lines is a bug nobody can see.
//
// The same mechanism serves an invoice, a quote and a purchase order. They
// differ only in which catalogue they pick from and what the totals are called,
// which is what LINE_SOURCES declares.
// ─────────────────────────────────────────────────────────────────────────────

export const LINE_FIELD = 'line_items';

/**
 * Which modules keep line items, and where their prices come from.
 *
 * `catalog` is a module id — the picker reads that module's records, so a build
 * exported without the products module simply gets a picker with free text and
 * no catalogue, rather than a broken screen.
 */
export const LINE_SOURCES = {
  invoices: {
    catalog: 'products',
    priceField: 'list_price',
    totalField: 'amount',
    vatField: 'vat_percent',
    label: 'שורות החשבונית',
  },
  purchasing: {
    catalog: 'inventory',
    priceField: 'unit_cost',
    totalField: 'amount',
    vatField: null,
    label: 'שורות ההזמנה',
  },
};

export const lineSourceFor = (moduleId) => LINE_SOURCES[moduleId] || null;

/** True when this build actually contains the catalogue a source wants. */
export const catalogAvailable = (source) => !!(source && CRM_SCHEMAS[source.catalog]);

export const emptyLine = () => ({
  product_id: '',
  name: '',
  quantity: 1,
  unit_price: 0,
  discount_percent: 0,
});

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** One line's own total, after its discount. Never negative. */
export function lineTotal(line) {
  const gross = num(line?.quantity) * num(line?.unit_price);
  const discount = Math.min(Math.max(num(line?.discount_percent), 0), 100);
  return Math.max(0, gross * (1 - discount / 100));
}

/**
 * What a set of lines comes to.
 *
 * VAT is applied to the discounted subtotal, which is the order the tax
 * authority expects and the order every accountant will check.
 */
export function lineTotals(lines, vatPercent = 0) {
  const list = Array.isArray(lines) ? lines : [];
  const subtotal = list.reduce((sum, line) => sum + lineTotal(line), 0);
  const vat = subtotal * (Math.max(num(vatPercent), 0) / 100);
  return {
    count: list.length,
    subtotal: round(subtotal),
    vat: round(vat),
    total: round(subtotal + vat),
  };
}

// Money is rounded to the agora at every boundary. Carrying floating point
// noise into a printed document produces a total that is one agora off and an
// afternoon of arguing about it.
const round = (n) => Math.round(n * 100) / 100;

/** A catalogue record turned into a line, keeping the link back to it. */
export function lineFromProduct(product, source) {
  if (!product) return emptyLine();
  return {
    product_id: product.id || '',
    name: product.name || product.sku || '',
    quantity: 1,
    unit_price: num(product[source?.priceField] ?? product.list_price ?? 0),
    discount_percent: 0,
  };
}

/**
 * Whether a line breaks the discount ceiling its product declares.
 *
 * Returned rather than thrown: the salesperson may still have authority to do
 * it, and the screen only has to say so.
 */
export function discountBreach(line, product) {
  const max = Number(product?.max_discount_percent);
  if (!Number.isFinite(max) || max <= 0) return null;
  const asked = num(line?.discount_percent);
  return asked > max ? { max, asked } : null;
}

/** Lines with nothing in them at all — never worth saving. */
export const isBlankLine = (line) =>
  !line?.name?.trim() && !num(line?.quantity) && !num(line?.unit_price);

export const cleanLines = (lines) => (Array.isArray(lines) ? lines.filter((l) => !isBlankLine(l)) : []);

/** A one-line summary of what a record contains, for a list cell. */
export function describeLines(lines) {
  const list = cleanLines(lines);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0].name || 'שורה אחת';
  return `${list[0].name || 'שורה'} +${list.length - 1}`;
}

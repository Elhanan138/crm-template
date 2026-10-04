import { lineTotal, cleanLines, LINE_FIELD } from '@/lib/crm/lineItems';
import { num } from '@/lib/crm/derived';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT A PRODUCT ACTUALLY SELLS FOR
//
// docs/VALUE-MAP.md promises the cheapest combination in the system with the
// fastest return: quotes plus a price list tells you "the real margin per line,
// and which product is always sold at the maximum discount — meaning its list
// price is wrong". Nothing computed it. The catalogue knew its list price and
// its ceiling, the documents knew what was actually charged, and the two never
// met.
//
// Everything here is derived from lines that are ALREADY stored. No new field,
// no new typing, nothing to migrate.
//
// A product is priced wrong when the discount it is sold at stops being an
// exception. Two different symptoms, deliberately kept apart:
//
//   BREACH   — sold past the ceiling it declares. Someone overrode a rule.
//   PRESSURE — sold at or near that ceiling every time. Nobody broke a rule;
//              the rule is simply wrong, and that is the more expensive case
//              because it never shows up as an exception.
// ─────────────────────────────────────────────────────────────────────────────

/** At or above this share of the declared ceiling, a discount is the norm. */
const AT_CEILING = 0.9;
/** Below this many lines, "always" means nothing. */
const MIN_LINES = 2;

const round = (n) => Math.round(n * 100) / 100;

/** The lines of every document, flattened, keeping only those naming a product. */
export function soldLines(documents = []) {
  return (documents || []).flatMap((doc) => cleanLines(doc?.[LINE_FIELD]))
    .filter((line) => !!line.product_id);
}

/**
 * One row per product that has actually been sold.
 *
 * `cost` comes from the catalogue, so the margin is the REALIZED one — what was
 * charged after discount, less what it cost — not the list margin the product
 * page already shows.
 */
export function productPerformance(products = [], documents = []) {
  const byProduct = new Map();
  for (const line of soldLines(documents)) {
    if (!byProduct.has(line.product_id)) byProduct.set(line.product_id, []);
    byProduct.get(line.product_id).push(line);
  }

  const rows = [];
  for (const product of products || []) {
    const lines = byProduct.get(product.id);
    if (!lines?.length) continue;

    const units = lines.reduce((sum, l) => sum + num(l.quantity), 0);
    const revenue = lines.reduce((sum, l) => sum + lineTotal(l), 0);
    const cost = num(product.cost) * units;
    const ceiling = num(product.max_discount_percent);

    // Weighted by quantity: one line of 100 units at 40% off says more about
    // this product's pricing than ten single units at list.
    const discountWeight = lines.reduce((sum, l) => sum + num(l.discount_percent) * num(l.quantity), 0);
    const avgDiscount = units > 0 ? discountWeight / units : 0;

    const breaches = ceiling > 0 ? lines.filter((l) => num(l.discount_percent) > ceiling).length : 0;
    const atCeiling = ceiling > 0 ? lines.filter((l) => num(l.discount_percent) >= ceiling * AT_CEILING).length : 0;

    rows.push({
      id: product.id,
      name: product.name || product.sku || '',
      sku: product.sku || '',
      lines: lines.length,
      units: round(units),
      revenue: Math.round(revenue),
      // Null rather than zero when the catalogue never recorded a cost: an
      // unknown margin and a zero margin are not the same answer.
      marginPercent: num(product.cost) > 0 && revenue > 0 ? round(((revenue - cost) / revenue) * 100) : null,
      avgDiscount: round(avgDiscount),
      maxDiscount: ceiling,
      breaches,
      // The ceiling is the rule; selling at it every time means the rule is
      // wrong. One line at the ceiling is a negotiation, not a pattern.
      underPressure: ceiling > 0 && lines.length >= MIN_LINES && atCeiling === lines.length,
    });
  }

  return rows.sort((a, b) => b.revenue - a.revenue);
}

/** The headline: what was sold, and how much of it is priced wrong. */
export function performanceSummary(rows = []) {
  return {
    sold: rows.length,
    revenue: rows.reduce((sum, r) => sum + r.revenue, 0),
    breached: rows.filter((r) => r.breaches > 0).length,
    underPressure: rows.filter((r) => r.underPressure).length,
  };
}

/** Products worth looking at first: a broken rule, or a rule that is wrong. */
export const needsReview = (row) => row.breaches > 0 || row.underPressure;

/** What to say about one row, as a tone and a reason, or null when it is fine. */
export function priceVerdict(row) {
  if (row.breaches > 0) {
    return { tone: 'destructive', label: 'מעל ההנחה המרבית', count: row.breaches };
  }
  if (row.underPressure) {
    return { tone: 'warning', label: 'נמכר תמיד בהנחה המרבית', count: row.lines };
  }
  return null;
}

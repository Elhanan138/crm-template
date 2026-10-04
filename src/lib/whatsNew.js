import { useCallback, useEffect, useState } from 'react';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT'S NEW
//
// A capability nobody notices is a capability nobody uses. The debt-aging
// tiles, the quote-to-invoice hand-off, the rule library — each arrived in a
// module somebody already knew and had stopped looking at closely.
//
// An entry names the module it lives in. Until the person has opened that
// module once, its sidebar link carries a dot; opening it marks the entry
// seen. Kept per browser — what one person has seen says nothing about what
// anyone else has — and only for modules this build contains.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'whats_new_seen';
const EVENT = 'whats-new-seen';

export const WHATS_NEW = [
  { id: '2026-10-aging', module: 'invoices', title: 'גיול חוב שנלחץ', body: 'כל אריח גיול מסנן את הרשימה לחשבוניות שמאחוריו.' },
  { id: '2026-10-handoffs', module: 'proposals', title: 'מליד להצעה לחשבונית', body: 'הצעה מאושרת הופכת לחשבונית בלחיצה, עם הלקוח והסכום.' },
  { id: '2026-10-versions', module: 'proposals', title: 'גרסאות להצעות', body: 'שינוי במחיר יוצר גרסה חדשה במקום לדרוס את הקודמת.' },
  { id: '2026-10-pricing', module: 'products', title: 'מחירון שלא מחזיק', body: 'מוצרים שנמכרים תמיד בהנחה המרבית — מחושב מהחשבוניות.' },
  { id: '2026-10-library', module: 'automations', title: 'ספריית כללים ובדיקה יבשה', body: 'כללים מוכנים, ובדיקה על אילו רשומות כלל היה פועל.' },
  { id: '2026-10-approvals', module: 'purchasing', title: 'אישור הזמנות', body: 'הזמנה מעל ₪5,000 לא יוצאת בלי מאשר.' },
  { id: '2026-10-org', module: 'employees', title: 'מבנה ארגוני וחופשות', body: 'מי מדווח למי, ומי בחופשה היום.' },
  { id: '2026-10-matrix', module: 'training', title: 'מטריצת כשירות', body: 'אנשים מול קורסים — כיסוי ומוכנות.' },
  { id: '2026-10-residual', module: 'risks', title: 'סיכון שיורי', body: 'מה נשאר אחרי הטיפול, לצד הסיכון לפניו.' },
  { id: '2026-10-sla', module: 'support', title: 'SLA לפי עדיפות', body: 'חריגה מוצגת לפי ההתחייבות, לא לפי גיל.' },
  { id: '2026-10-reports', module: 'reports', title: 'דוחות שמורים', body: 'תצוגת דוח נשמרת בשם ומשותפת לצוות.' },
  { id: '2026-10-notes', module: 'notes', title: 'תבניות פתקים', body: 'סיכום פגישה, התנעה ועוד — וייצוא ל-Markdown.' },
].filter((entry) => ACTIVE_MODULE_IDS.includes(entry.module));

const readSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch { return new Set(); }
};

/** The entries this person has not opened yet. */
export const unseenEntries = (seen = readSeen()) => WHATS_NEW.filter((e) => !seen.has(e.id));

/** Is there anything new behind a module's link? */
export const moduleHasNews = (moduleId, seen = readSeen()) =>
  WHATS_NEW.some((e) => e.module === moduleId && !seen.has(e.id));

/** Mark a module's entries seen — called when the module is opened. */
export function markModuleSeen(moduleId) {
  const seen = readSeen();
  const fresh = WHATS_NEW.filter((e) => e.module === moduleId && !seen.has(e.id));
  if (!fresh.length) return;
  for (const e of fresh) seen.add(e.id);
  try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch { /* private mode */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The module a path belongs to, read from the manifest's own routes. */
export function moduleForPath(pathname = '') {
  let best = null;
  for (const [id, mod] of Object.entries(MODULES)) {
    for (const route of mod.routes || []) {
      const base = route.path.split('/:')[0];
      if (base === '/' ? pathname === '/' : pathname === base || pathname.startsWith(`${base}/`)) {
        if (!best || base.length > best.length) best = { id, length: base.length };
      }
    }
  }
  return best?.id || null;
}

/** Re-renders when anything is marked seen, in this tab. */
export function useWhatsNew() {
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => {
    const refresh = () => setSeen(readSeen());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const hasNews = useCallback((moduleId) => moduleHasNews(moduleId, seen), [seen]);
  return { hasNews, unseen: unseenEntries(seen) };
}

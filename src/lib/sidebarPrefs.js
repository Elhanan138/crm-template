import { useCallback, useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR PREFERENCE
//
// Whether the sidebar is an icon rail or a labelled list is a preference, and
// it was neither remembered nor sensibly defaulted: it reset to the wide list
// on every page load, so anyone who collapsed it collapsed it again, and again.
//
// The default is now the RAIL. With twenty-five modules the labelled list is
// the widest thing on the screen and the first thing in the way of the work —
// and the rail keeps every icon, the tooltips and the active marker, so nothing
// is lost by starting narrow. One press widens it, and that press is kept.
//
// Stored per browser, never per record: one person widening their sidebar does
// not widen everybody else's.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'sidebar_collapsed';
export const DEFAULT_COLLAPSED = true;

/** The stored preference, or the default when there is nothing to read. */
export function readCollapsed() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch { /* private mode, cleared storage, blocked site data */ }
  return DEFAULT_COLLAPSED;
}

export function writeCollapsed(collapsed) {
  try { localStorage.setItem(KEY, collapsed ? 'true' : 'false'); } catch { /* private mode */ }
}

/** The sidebar's width preference, remembered across loads. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  // Written in an effect rather than in the toggle, so the stored value cannot
  // drift from the rendered one however the state came to change.
  useEffect(() => { writeCollapsed(collapsed); }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  return [collapsed, toggle];
}

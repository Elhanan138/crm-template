import React, { useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { MODULES } from '@/lib/modules';
import { workspaceForPath, moduleForPath, prefetchPath } from '@/lib/moduleRegistry';
import { SETTINGS_KEY, isCapabilityVisible } from '@/lib/capabilities';
import { useAccessControl } from '@/hooks/useAccessControl';

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE TABS — the second level of navigation.
//
// The sidebar lists workspaces; a workspace holds up to six modules. Until now
// the only way from "לידים" to "תחזית" was back through the sidebar — on mobile,
// through opening the drawer. That is what made a coherent workspace read as a
// pile of unrelated sub-pages.
//
// One row of tabs, derived from the same manifest as everything else. It scrolls
// horizontally rather than wrapping, so a six-module workspace stays one line on
// a phone, and the active tab is scrolled into view on arrival.
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkspaceTabs() {
  const location = useLocation();
  const { isRealAdmin } = useAccessControl();
  const activeRef = useRef(null);

  const { data: sysFeaturesRes } = useQuery({
    queryKey: ['global-system-features'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: SETTINGS_KEY }),
    staleTime: 60000,
  });
  const values = sysFeaturesRes?.data?.value;

  const workspace = workspaceForPath(location.pathname);
  const activeModule = moduleForPath(location.pathname);

  const tabs = (workspace?.children || []).filter((id) =>
    isCapabilityVisible(values, `module:${id}`, isRealAdmin)
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeModule]);

  // A workspace with a single reachable module is not a tab strip — the page
  // title already says where you are.
  if (tabs.length < 2) return null;

  return (
    <nav
      dir="rtl"
      aria-label={workspace.label}
      className="mb-4 border-b border-border overflow-x-auto"
    >
      <div className="flex items-center gap-1 min-w-max">
        {tabs.map((id) => {
          const active = id === activeModule;
          return (
            <Link
              key={id}
              ref={active ? activeRef : undefined}
              to={MODULES[id].navPath}
              onMouseEnter={() => prefetchPath(MODULES[id].navPath)}
              onFocus={() => prefetchPath(MODULES[id].navPath)}
              aria-current={active ? 'page' : undefined}
              className={`relative whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground font-medium hover:text-foreground'
              }`}
            >
              {MODULES[id].label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

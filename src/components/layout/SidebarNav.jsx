import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { prefetchPath } from '@/lib/moduleRegistry';

const ORDER_KEY = 'sidebarNavOrder';
const EXPANDED_KEY = 'sidebarNavExpanded';

const GROUP_ORDER = ['core', 'operations'];

export default function SidebarNav({ items, isCollapsed, onNavigate }) {
  const location = useLocation();
  const [orderedItems, setOrderedItems] = useState(items);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY));
      // A saved order from an older build can reference paths that no longer
      // exist. Items missing from it must still render — never drop one.
      if (Array.isArray(saved) && saved.length > 0) {
        const ordered = [...items].sort((a, b) => {
          const ai = saved.indexOf(a.path);
          const bi = saved.indexOf(b.path);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        setOrderedItems(ordered);
      } else {
        setOrderedItems(items);
      }
    } catch {
      setOrderedItems(items);
    }
  }, [items]);

  const isProjectDetailPage = (path) => path.startsWith('/projects/') && path !== '/projects/new';

  // Which workspaces are manually expanded. Persisted so the tree does not
  // reset on every reload.
  const [expanded, setExpanded] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EXPANDED_KEY)) || []; } catch { return []; }
  });

  const persistExpanded = (next) => {
    setExpanded(next);
    try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };

  const toggle = (workspace) =>
    persistExpanded(
      expanded.includes(workspace) ? expanded.filter((w) => w !== workspace) : [...expanded, workspace]
    );

  // Navigating into a workspace should leave it open afterwards.
  const expand = (item) => {
    if (item.workspace && !expanded.includes(item.workspace)) persistExpanded([...expanded, item.workspace]);
  };

  const matches = (paths) =>
    paths.some((p) => p !== '/' && (location.pathname === p || location.pathname.startsWith(`${p}/`))) ||
    (paths.includes('/projects') && isProjectDetailPage(location.pathname));

  const isActive = (item) => {
    if (item.path === '/') return location.pathname === '/';
    // A workspace stays lit for any of its modules' paths, not just the first one.
    return matches(item.matchPaths?.length ? item.matchPaths : [item.path]);
  };

  // Group items by their group field, preserving order within each group.
  // Anything with an unrecognised group falls into 'core' rather than vanishing —
  // a nav item must never be silently dropped because a group name was missed.
  const known = new Set(GROUP_ORDER);
  const grouped = GROUP_ORDER
    .map(g => orderedItems.filter(i => {
      const group = i.group || 'core';
      return known.has(group) ? group === g : g === 'core';
    }))
    .filter(g => g.length > 0);

  return (
    <nav className={`flex-1 py-3 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
      {grouped.map((groupItems, gi) => (
        <div key={gi} className="space-y-0.5">
          {groupItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const hasChildren = item.children?.length > 0;
            // Open when you are inside it, or when you opened it yourself.
            const open = hasChildren && (active || expanded.includes(item.workspace));
            return (
              <div key={item.workspace || item.path}>
                <div className="relative flex items-center">
                  <Link
                    to={item.path}
                    onClick={() => { expand(item); onNavigate?.(); }}
                    onMouseEnter={() => prefetchPath(item.path)}
                    onFocus={() => prefetchPath(item.path)}
                    title={isCollapsed ? item.label : undefined}
                    className={`relative flex flex-1 min-w-0 items-center gap-3 rounded-xl text-sm transition-all duration-150 ${
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                    } ${
                      active
                        ? 'bg-primary/8 text-primary font-semibold'
                        : 'text-foreground/70 font-medium hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    {/* Active indicator — vertical bar on the start edge (right in RTL) */}
                    {active && (
                      <span className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-e-full bg-primary" />
                    )}
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>

                  {/* Expand toggle — sub-pages are reachable without first
                      navigating into the workspace. */}
                  {!isCollapsed && hasChildren && (
                    <button
                      type="button"
                      onClick={() => toggle(item.workspace)}
                      aria-expanded={open}
                      aria-label={`${open ? 'סגור' : 'פתח'} ${item.label}`}
                      className="p-2 md:p-1 -ms-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors flex-shrink-0"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? '' : 'rotate-90'}`} />
                    </button>
                  )}
                </div>

                {/* Sub-pages. The guide rail sits on the start edge — the RIGHT
                    side in RTL — with the labels indented away from it. */}
                {!isCollapsed && hasChildren && open && (
                  <div className="relative my-1 ms-3 me-1 border-s border-border">
                    {item.children.map((child) => {
                      const childActive = matches(child.matchPaths);
                      return (
                        <Link
                          key={child.id}
                          to={child.path}
                          onClick={onNavigate}
                          onMouseEnter={() => prefetchPath(child.path)}
                          onFocus={() => prefetchPath(child.path)}
                          className={`relative block ps-4 pe-2 py-2.5 md:py-1.5 text-[13px] rounded-s-lg transition-colors ${
                            childActive
                              ? 'text-primary font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {childActive && (
                            <span className="absolute -start-px top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
                          )}
                          <span className="truncate block">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
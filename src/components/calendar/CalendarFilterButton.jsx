import React, { useState } from 'react';
import { Filter, Check, ChevronDown, ChevronLeft } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CATEGORY_LABELS } from '@/lib/calendarEventTypes';

function CollapsibleSection({ title, defaultOpen = true, headerExtra, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {open
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronLeft className="w-3.5 h-3.5 rotate-90" />}
          <span>{title}</span>
        </button>
        {headerExtra}
      </div>
      {open && (
        <div className="px-2 pb-2 space-y-0.5 max-h-[200px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function CheckRow({ checked, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent text-sm text-right transition-colors"
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * Unified calendar filter button — icon-only funnel (ghost, no label) placed
 * in the page header. Opens a popover with two collapsible sections:
 * event-type (multi-select) and projects (multi-select with הכל/כלום).
 */
export default function CalendarFilterButton({
  disabledTypes = new Set(),
  toggleType,
  visibleProjects = [],
  disabledProjects = new Set(),
  toggleProject,
  selectAllProjects,
  deselectAllProjects,
}) {
  const activeProjectCount = visibleProjects.length - disabledProjects.size;
  const hasActiveFilters = disabledTypes.size > 0 || disabledProjects.size > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="סינון יומן"
        >
          <Filter className="w-4 h-4" />
          {hasActiveFilters && (
            <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-card" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" className="w-72 p-0 rounded-lg">
        <CollapsibleSection title="סוג אירוע">
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <CheckRow
              key={k}
              checked={!disabledTypes.has(k)}
              onClick={() => toggleType(k)}
              label={v}
            />
          ))}
        </CollapsibleSection>
        <CollapsibleSection
          title="פרויקטים מוצגים"
          headerExtra={
            <div className="flex items-center gap-1">
              <button onClick={selectAllProjects} className="text-[11px] font-semibold text-primary hover:underline">הכל</button>
              <span className="text-muted-foreground/40">|</span>
              <button onClick={deselectAllProjects} className="text-[11px] font-semibold text-muted-foreground hover:underline">כלום</button>
            </div>
          }
        >
          {visibleProjects.length === 0 ? (
            <div className="px-2 py-3 text-center text-caption">אין פרויקטים זמינים</div>
          ) : (
            visibleProjects.map(p => (
              <CheckRow
                key={p.id}
                checked={!disabledProjects.has(p.id)}
                onClick={() => toggleProject(p.id)}
                label={p.client_name || p.name}
              />
            ))
          )}
        </CollapsibleSection>
        {hasActiveFilters && (
          <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border">
            {disabledTypes.size > 0 && <span>{disabledTypes.size} סוגים מוסתרים</span>}
            {disabledTypes.size > 0 && disabledProjects.size > 0 && <span> · </span>}
            {disabledProjects.size > 0 && <span>{activeProjectCount} פרויקטים מוצגים</span>}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
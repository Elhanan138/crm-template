import React from 'react';
import { Check } from 'lucide-react';

const MAX = 4;

/**
 * Per-widget config for quick access (rendered inside DashboardCustomizer):
 * pick up to MAX pinned projects. Saves immediately on toggle.
 */
export default function QuickAccessConfig({ projects, pinnedIds = [], onSave }) {
  const toggle = (id) => {
    if (pinnedIds.includes(id)) return onSave(pinnedIds.filter(x => x !== id));
    if (pinnedIds.length >= MAX) return;
    onSave([...pinnedIds, id]);
  };

  if (projects.length === 0) {
    return <p className="text-caption">אין פרויקטים זמינים</p>;
  }

  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
        בחר עד {MAX} פרויקטים · נבחרו {pinnedIds.length}/{MAX}
      </p>
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {projects.map(p => {
          const active = pinnedIds.includes(p.id);
          const disabled = !active && pinnedIds.length >= MAX;
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={disabled}
              className={`w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-right transition-all ${active ? 'bg-primary/10 border-primary/40' : disabled ? 'bg-muted/30 border-border opacity-50 cursor-not-allowed' : 'bg-card border-border hover:border-primary/30'}`}
            >
              <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                {active && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className="text-xs font-medium text-foreground truncate">{p.client_name || p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
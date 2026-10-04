import React, { useState } from 'react';
import RecordTrail, { TRAIL_TABS } from '@/components/crm/RecordTrail';
import { useI18n } from '@/lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// RECORD TRAIL STRIP
//
// The history, the activity and the files of a record, as three icons in a
// form's header and a panel that opens under it.
//
// This exists so the trail is not wired by hand into each form. It was in the
// CRM sheet and nowhere else — a task, a ticket and a project had no history
// anyone could read, and no way to attach a file to them.
//
// A form takes two lines: the buttons where its header is, the panel where its
// body ends. The state lives in the hook they share.
// ─────────────────────────────────────────────────────────────────────────────

/** The open tab and the counts, shared by the buttons and the panel. */
export function useRecordTrail() {
  const [tab, setTab] = useState(null);
  const [counts, setCounts] = useState({});
  return {
    tab,
    counts,
    setCounts,
    toggle: (id) => setTab((current) => (current === id ? null : id)),
  };
}

/** Three icons for a form's header. Renders nothing before a record exists. */
export function RecordTrailButtons({ trail, recordId, className = '' }) {
  const { t } = useI18n();
  if (!recordId) return null;

  return (
    <div className={`flex items-center gap-1 flex-shrink-0 ${className}`}>
      {TRAIL_TABS.map((item) => {
        const open = trail.tab === item.id;
        const count = trail.counts[item.id] || 0;
        return (
          <button
            key={item.id}
            type="button"
            title={t(item.label)}
            aria-label={t(item.label)}
            aria-pressed={open}
            onClick={() => trail.toggle(item.id)}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
              open
                ? 'bg-accent text-accent-foreground border-primary/30'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
            {count > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center tabular-nums">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The panel the buttons open.
 *
 * It stays mounted while closed so the counts on the buttons are known before
 * anyone presses one — a badge that only appears after you look is no use.
 */
export function RecordTrailPanel({ trail, schema, entity, record }) {
  if (!record?.id) return null;
  return (
    <div className={trail.tab ? 'pt-3 mt-3 border-t border-border' : 'hidden'}>
      <RecordTrail
        schema={schema}
        entity={entity}
        record={record}
        activeTab={trail.tab || 'history'}
        onCounts={trail.setCounts}
      />
    </div>
  );
}

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import {
  AlertTriangle, FileText, Key, Snowflake, ChevronLeft,
} from 'lucide-react';
import WidgetShell, { WidgetEmpty } from './WidgetShell';
import { getProjectPath } from '@/lib/projectSlug';

const parseDate = (d) => {
  if (!d) return null;
  const v = typeof d === 'string' ? parseISO(d) : new Date(d);
  return isValid(v) ? v : null;
};

const ROW_STYLES = {
  quote: { icon: FileText, chip: 'bg-info-muted text-info' },
  licensing: { icon: Key, chip: 'bg-neutral-muted text-foreground' },
  frozen: { icon: Snowflake, chip: 'bg-info-muted text-info' },
};

function Row({ item }) {
  const cfg = ROW_STYLES[item.kind];
  const Icon = cfg.icon;
  return (
    <Link
      to={item.to}
      className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 hover:bg-muted/40 transition-colors"
    >
      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${cfg.chip}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground leading-snug truncate">{item.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
      </div>
      <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

/**
 * "דורש טיפול" — aggregates time-sensitive items across all visible projects:
 * quotes awaiting follow-up, hours-bank threshold crossings,
 * approaching licensing reminders, and engagements coming out of freeze.
 * Filtered to projects the user may view (caller passes already-scoped data).
 */
export default function RequiresAttention({ projects, quotes, limit = 8 }) {
  const items = useMemo(() => {
    const today = new Date();
    const out = [];
    const projName = (id) => {
      const p = projects.find(x => x.id === id);
      return p?.client_name || p?.name || '';
    };
    const projPath = (id) => {
      const p = projects.find(x => x.id === id);
      return p ? getProjectPath(p) : `/projects/${id}`;
    };

    // Quotes awaiting follow-up (follow_up_date reached, not signed/rejected)
    for (const q of quotes) {
      const d = parseDate(q.follow_up_date);
      if (!d) continue;
      if (q.status === 'signed' || q.status === 'rejected') continue;
      const days = differenceInCalendarDays(today, d);
      if (days >= 0) {
        out.push({
          kind: 'quote',
          title: `מעקב הצעת מחיר: ${q.title}`,
          subtitle: `${projName(q.project_id)} • הגיע מועד מעקב`,
          to: projPath(q.project_id),
          severity: 60 + days,
        });
      }
    }

    // Licensing reminders approaching (within 14 days, not past by more than 30)
    for (const p of projects) {
      const d = parseDate(p.licensing_reminder_date);
      if (!d) continue;
      const days = differenceInCalendarDays(d, today);
      if (days <= 14 && days >= -30) {
        out.push({
          kind: 'licensing',
          title: 'תזכורת רישוי מתקרבת',
          subtitle: `${p.client_name || p.name} • ${days >= 0 ? `בעוד ${days} ימים` : 'הגיע מועד'}`,
          to: getProjectPath(p),
          severity: 40,
        });
      }
    }

    // Engagements coming out of freeze (frozen_until within 14 days or just passed)
    for (const p of projects) {
      const d = parseDate(p.frozen_until);
      if (!d) continue;
      const days = differenceInCalendarDays(d, today);
      if (days <= 14 && days >= -30) {
        out.push({
          kind: 'frozen',
          title: 'יציאה מהקפאה',
          subtitle: `${p.client_name || p.name} • ${days >= 0 ? `בעוד ${days} ימים` : 'ההקפאה הסתיימה'}`,
          to: getProjectPath(p),
          severity: 30,
        });
      }
    }

    return out.sort((a, b) => b.severity - a.severity);
  }, [projects, quotes]);

  const shown = items.slice(0, limit);

  return (
    <WidgetShell
      title="דורש טיפול"
      subtitle="פריטים רגישי-זמן בכל הפרויקטים שלך"
      icon={AlertTriangle}
      accent="rose"
      headerExtra={items.length > 0 ? (
        <span className="text-xs font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{items.length}</span>
      ) : null}
    >
      {shown.length === 0 ? (
        <WidgetEmpty text="הכל מטופל — אין פריטים דחופים ✓" />
      ) : (
        <div className="space-y-2">
          {shown.map((item, i) => <Row key={i} item={item} />)}
          {items.length > shown.length && (
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              ועוד {items.length - shown.length} פריטים
            </p>
          )}
        </div>
      )}
    </WidgetShell>
  );
}

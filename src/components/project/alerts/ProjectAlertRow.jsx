import React from 'react';
import { Bell, Mail, Trash2, RotateCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import StatusBadge from '@/components/shared/StatusBadge';
import { describeAlert } from './alertConfig';
import { formatDate } from '@/lib/formatDate';
import AlertInfoButton from './AlertInfoButton';

export default function ProjectAlertRow({ alert, recipientLabel, onEdit, onDelete, onToggleActive, onReactivate }) {
  const isFiredOneTime = alert.trigger === 'one_time' && !alert.active && alert.last_sent_key;
  const sentDate = isFiredOneTime ? formatDate(alert.updated_date, 'short-padded') : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(alert)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(alert); } }}
      className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5 cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{describeAlert(alert)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{recipientLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {alert.channels?.bell && <Bell className="w-3.5 h-3.5 text-primary" />}
          {alert.channels?.email && <Mail className="w-3.5 h-3.5 text-info" />}
          <AlertInfoButton alert={alert} />
        </div>
      </div>

      {alert.message && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5 line-clamp-2">
          {alert.message}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isFiredOneTime ? (
            <StatusBadge
              label={`נשלחה ב-${sentDate}`}
              tone="neutral"
            />
          ) : (
            <>
              <StatusBadge
                label={alert.active ? 'פעיל' : 'מושבת'}
                tone={alert.active ? 'success' : 'neutral'}
              />
              <span onClick={(e) => e.stopPropagation()} className="flex items-center">
                <Switch
                  checked={alert.active}
                  onCheckedChange={(v) => onToggleActive(alert, v)}
                />
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isFiredOneTime && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReactivate(alert); }}
              className="h-7 px-2.5 rounded-full flex items-center gap-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              הפעל מחדש
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(alert); }}
            className="h-8 w-8 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
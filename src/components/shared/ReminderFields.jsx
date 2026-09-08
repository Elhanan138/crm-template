import React from 'react';
import { Bell } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateField from '@/components/ui/date-field';
import TimeField from '@/components/ui/time-field';
import { REMINDER_CHANNEL_OPTIONS } from '@/lib/reminderChannels';

/**
 * Unified reminder fields UI — extracted 1:1 from HighlightForm.
 * Used by HighlightForm and QuoteForm — single source of truth.
 *
 * @param {object} value - { reminder_date, reminder_time, reminder_channel }
 * @param {function} onChange - receives a patch object to merge into parent form state
 * @param {boolean} disabled
 * @param {string} label - defaults to 'תזכורת (אופציונלי)'
 */
export default function ReminderFields({ value, onChange, disabled, label = 'תזכורת (אופציונלי)' }) {
  const { reminder_date = '', reminder_time = '', reminder_channel = 'bell' } = value || {};

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">תאריך</Label>
          <DateField
            value={reminder_date}
            onChange={v => onChange({ reminder_date: v })}
            placeholder="בחר תאריך"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">שעה</Label>
          <TimeField
            value={reminder_time}
            onChange={v => onChange({ reminder_time: v })}
            placeholder="HH:MM"
            className="h-9 text-sm"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">ערוץ תזכורת</Label>
        <Select
          value={reminder_channel}
          onValueChange={v => onChange({ reminder_channel: v })}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_CHANNEL_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
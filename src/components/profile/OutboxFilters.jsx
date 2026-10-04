import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HebrewDateInput from '@/components/shared/HebrewDateInput';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUS_CHIPS = [
  { value: 'all', label: 'הכל' },
  { value: 'sent', label: 'נשלח' },
  { value: 'failed', label: 'נכשל' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'כל המקורות' },
  { value: 'alert', label: 'התראה' },
  { value: 'support_ticket', label: 'פנייה' },
  { value: 'backfill', label: 'ייבוא רטרו' },
  { value: 'test_email', label: 'בדיקה' },
  { value: 'manual', label: 'ידני' },
];

export default function OutboxFilters({ filters, onChange, senders }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  const hasActive =
    filters.status !== 'all' ||
    filters.source !== 'all' ||
    filters.sender !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  const reset = () =>
    onChange({ status: 'all', source: 'all', sender: 'all', dateFrom: '', dateTo: '' });

  return (
    <div className="space-y-2.5">
      {/* Status chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground ms-1">סטטוס:</span>
        {STATUS_CHIPS.map(chip => (
          <button
            key={chip.value}
            type="button"
            onClick={() => update('status', chip.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.status === chip.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Dropdowns + date range */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filters.source} onValueChange={v => update('source', v)}>
          <SelectTrigger className="w-auto h-8 text-xs min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sender} onValueChange={v => update('sender', v)}>
          <SelectTrigger className="w-auto h-8 text-xs min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל השולחים</SelectItem>
            {senders.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <HebrewDateInput
          value={filters.dateFrom}
          onChange={v => update('dateFrom', v)}
          className="w-auto h-8 text-xs"
          aria-label="תאריך מ"
        />
        <span className="text-caption">—</span>
        <HebrewDateInput
          value={filters.dateTo}
          onChange={v => update('dateTo', v)}
          className="w-auto h-8 text-xs"
          aria-label="תאריך עד"
        />

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-8 gap-1 text-xs">
            <X className="w-3 h-3" />
            נקה
          </Button>
        )}
      </div>
    </div>
  );
}
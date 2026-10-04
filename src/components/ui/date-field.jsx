import React, { useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function parseValue(value) {
  if (!value) return null;
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

function toISODate(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextRoundHour(now = new Date()) {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/**
 * Unified Israeli date picker.
 * - value: ISO string (yyyy-MM-dd for date-only, or full ISO for datetime) | null
 * - onChange: returns ISO (yyyy-MM-dd for date-only, or full ISO when withTime)
 * - Displays dd/MM/yyyy in Hebrew; week starts Sunday; full RTL.
 */
export default function DateField({
  value,
  onChange,
  placeholder = 'בחר תאריך',
  disabled = false,
  minDate,
  maxDate,
  clearable = false,
  withTime = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const date = parseValue(value);
  const now = new Date();

  const displayDate = date ? format(date, 'dd/MM/yyyy', { locale: he }) : '';
  const displayTime = date
    ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : '';
  const display = date
    ? (withTime ? `${displayDate} · ${displayTime}` : displayDate)
    : '';

  const select = (d) => {
    if (!d) {
      onChange(withTime ? null : '');
      return;
    }
    if (withTime) {
      const existing = date;
      d.setHours(existing ? existing.getHours() : 9, existing ? existing.getMinutes() : 0, 0, 0);
      onChange(d.toISOString());
    } else {
      onChange(toISODate(d));
      setOpen(false);
    }
  };

  const handleHour = (val) => {
    const base = date ? new Date(date) : nextRoundHour(now);
    base.setHours(Number(val), date ? date.getMinutes() : 0, 0, 0);
    onChange(base.toISOString());
  };

  const handleMinute = (val) => {
    const base = date ? new Date(date) : nextRoundHour(now);
    base.setHours(date ? date.getHours() : 9, Number(val), 0, 0);
    onChange(base.toISOString());
  };

  const disabledMatchers = [
    ...(minDate ? [{ before: minDate instanceof Date ? minDate : new Date(minDate) }] : []),
    ...(maxDate ? [{ after: maxDate instanceof Date ? maxDate : new Date(maxDate) }] : []),
  ];

  // For withTime, disable past dates
  const withTimeMatchers = withTime ? [{ before: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }] : disabledMatchers;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start gap-2 font-normal h-9 rounded-lg text-sm text-foreground',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {date && withTime ? (
            <span className="flex-1 text-start truncate">
              <span dir="ltr">{displayDate}</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span dir="ltr">{displayTime}</span>
            </span>
          ) : (
            <span className="flex-1 text-start truncate">{display || placeholder}</span>
          )}
          {clearable && date && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(withTime ? null : ''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(withTime ? null : ''); } }}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-auto p-2 max-h-[85vh] overflow-y-auto">
        {withTime && (
          <div className="grid grid-cols-2 gap-2 px-1 pb-2 mb-2 border-b border-border" dir="ltr">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">שעה</span>
              <Select value={String(date ? date.getHours() : 9)} onValueChange={handleHour}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {HOURS.map(hour => (
                    <SelectItem key={hour} value={String(hour)}>{String(hour).padStart(2, '0')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">דקות</span>
              <Select value={String(date ? date.getMinutes() : 0)} onValueChange={handleMinute}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {MINUTES.map(min => (
                    <SelectItem key={min} value={String(min)}>{String(min).padStart(2, '0')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={select}
          disabled={withTimeMatchers.length ? withTimeMatchers : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function formatTime(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTime(str) {
  if (!str) return { h: 9, m: 0 };
  const [h, m] = String(str).split(':').map(Number);
  return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m };
}

/**
 * Hebrew-friendly time picker — two side-by-side Selects (hour + minute).
 * - value: "HH:mm" string
 * - onChange: returns "HH:mm" string
 */
export default function TimeField({
  value,
  onChange,
  placeholder = 'בחר שעה',
  disabled = false,
  className,
}) {
  const { h, m } = parseTime(value);

  const selectHour = (newH) => onChange(formatTime(Number(newH), m));
  const selectMinute = (newM) => onChange(formatTime(h, Number(newM)));

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2" dir="ltr">
        <Select value={String(h)} onValueChange={selectHour} disabled={disabled}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {HOURS.map(hour => (
              <SelectItem key={hour} value={String(hour)}>{String(hour).padStart(2, '0')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(m)} onValueChange={selectMinute} disabled={disabled}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {MINUTES.map(min => (
              <SelectItem key={min} value={String(min)}>{String(min).padStart(2, '0')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
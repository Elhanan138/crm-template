import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const VARIANTS = {
  short: 'd/M/yy',
  medium: 'd MMM yyyy',
  full: 'd MMMM yyyy',
  datetime: 'dd/MM/yyyy HH:mm',
  'datetime-short': 'd/M HH:mm',
  'datetime-medium': 'd/M/yyyy HH:mm',
  'day-month': 'd MMM',
  'month-year': 'MMMM yyyy',
  'month-year-short': 'MMM yyyy',
  'day-month-num': 'd/M',
  day: 'd',
  'full-he': 'd בMMMM yyyy',
  'full-he-time': 'd בMMMM yyyy, HH:mm',
  'day-full': "EEEE d 'ב' MMMM yyyy",
  'time-day-short': 'HH:mm · d/M/yy',
  'weekday-narrow': 'EEEEEE',
  'day-month-padded': 'dd/MM',
  'short-month': 'd MMM yy',
  dmy: 'd/M/yyyy',
  'short-padded': 'dd/MM/yyyy',
};

export function formatDate(date, variant = 'medium') {
  if (!date) return '—';
  let d;
  if (date instanceof Date) {
    d = date;
  } else {
    const str = String(date);
    // Server returns UTC timestamps without a 'Z' suffix (e.g. "2026-07-19T13:37:37.278000").
    // Without 'Z', JavaScript parses them as local time, shifting the display backwards.
    // Append 'Z' so the value is parsed as UTC and then rendered in the user's local timezone.
    const hasTz = /[zZ]$/.test(str) || /[+-]\d{2}:?\d{2}$/.test(str);
    const isDateTime = str.includes('T');
    d = new Date(hasTz || !isDateTime ? str : str + 'Z');
  }
  if (isNaN(d.getTime())) return '—';
  const pattern = VARIANTS[variant] || VARIANTS.medium;
  return format(d, pattern, { locale: he });
}
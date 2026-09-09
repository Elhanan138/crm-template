import { STATUS_MAP } from '@/components/shared/StatusBadge';

const EXTRA_LABELS = {
  bug: 'באג',
  improvement: 'שיפור',
  feature: "פיצ'ר",
  other: 'אחר',
  fix_price: 'מחיר קבוע',
  hours_bank: 'בנק שעות',
  'ללא': 'ללא',
};

export function getLabel(key) {
  if (STATUS_MAP[key]) return STATUS_MAP[key].label;
  if (EXTRA_LABELS[key]) return EXTRA_LABELS[key];
  return key;
}

export function aggregate(items, field) {
  const counts = {};
  items.forEach(item => {
    const key = item[field] || 'ללא';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([key, value]) => ({
    name: getLabel(key),
    rawKey: key,
    value,
  }));
}

const TONE_HSL = {
  neutral: 'hsl(215 16% 47%)',
  success: 'hsl(150 84% 30%)',
  warning: 'hsl(38 92% 45%)',
  info: 'hsl(205 85% 45%)',
  destructive: 'hsl(0 75% 41%)',
  accent: 'hsl(150 88% 28%)',
};

const FALLBACK_PALETTE = [
  'hsl(150 88% 28%)',
  'hsl(205 85% 45%)',
  'hsl(38 92% 45%)',
  'hsl(280 65% 55%)',
  'hsl(340 75% 55%)',
  'hsl(215 16% 47%)',
];

export function getColorForKey(key, index) {
  const cfg = STATUS_MAP[key];
  if (cfg && TONE_HSL[cfg.tone]) return TONE_HSL[cfg.tone];
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}
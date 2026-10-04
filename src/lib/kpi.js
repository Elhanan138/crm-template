import { Target, CheckSquare, Clock, DollarSign, Route, Users, LifeBuoy } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';

/**
 * Semantic icon registry — one icon per concept across the entire system.
 * Unknown keys fall back to CubeIcon, never undefined.
 */
export const KPI_ICONS = {
  projects: CubeIcon,
  tasks: CheckSquare,
  hours: Clock,
  money: DollarSign,
  project_life: Route,
  support: LifeBuoy,
};

export const FALLBACK_ICON = CubeIcon;

export function getKpiIcon(metric) {
  return KPI_ICONS[metric] || FALLBACK_ICON;
}

const PROGRESS_METRICS = new Set(['progress', 'project_life', 'financial_progress', 'hours_progress']);

/**
 * Resolve a semantic tone from the metric's state, not from decoration.
 *
 * @param {object}  args
 * @param {string}  [args.metric]    — metric identifier (e.g. 'overdue', 'progress', 'primary')
 * @param {number}  [args.value]     — the numeric value
 * @param {object}  [args.threshold] — { warning?: number, destructive?: number }
 * @returns {'neutral'|'primary'|'info'|'success'|'warning'|'destructive'}
 */
export function resolveTone({ metric, value, threshold } = {}) {
  if (value == null) return 'neutral';
  const num = Number(value);
  if (isNaN(num)) return 'neutral';

  // Progress metric at 100% → success
  if (PROGRESS_METRICS.has(metric) && num >= 100) return 'success';

  // Zero value → neutral (no problem to report)
  if (num === 0) return 'neutral';

  // Threshold checks (higher = worse)
  if (threshold?.destructive != null && num >= threshold.destructive) return 'destructive';
  if (threshold?.warning != null && num >= threshold.warning) return 'warning';

  // Main metric → primary
  if (metric === 'primary') return 'primary';

  return 'neutral';
}

/**
 * Format a KPI value for display.
 *
 * @param {number|[number,number]|null|undefined} value
 * @param {'currency'|'percent'|'ratio'|'count'|'hours'} format
 * @returns {string}
 */
export function formatKpi(value, format, options = {}) {
  if (value == null) return '—';

  switch (format) {
    case 'currency': {
      const num = Number(value);
      if (isNaN(num)) return '—';
      const abs = Math.abs(num);
      if (options.compact && abs >= 1_000_000) return `₪${(num / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
      if (options.compact && abs >= 100_000)   return `₪${Math.round(num / 1000)}K`;
      return `₪${Math.round(num).toLocaleString('en-US')}`;
    }
    case 'percent': {
      const num = Number(value);
      if (isNaN(num)) return '—';
      return `${num}%`;
    }
    case 'ratio': {
      if (!Array.isArray(value) || value.length < 2) return '—';
      const used = Number(value[0]);
      const total = Number(value[1]);
      if (isNaN(used) || isNaN(total)) return '—';
      return `${used.toFixed(1)}/${Math.round(total)}`;
    }
    case 'count': {
      const num = Number(value);
      if (isNaN(num)) return '—';
      return String(Math.round(num));
    }
    case 'hours': {
      const num = Number(value);
      if (isNaN(num)) return '—';
      return `${num.toFixed(1)} שע׳`;
    }
    default:
      return String(value);
  }
}
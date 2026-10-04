import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { groupRows, aggregate, formatAggregate } from '@/lib/pivot';
import { translateValue } from './dataSources';
import { formatDate } from '@/lib/formatDate';
import StatusBadge from '@/components/shared/StatusBadge';

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'currency') return `₪${Number(value).toLocaleString('he-IL')}`;
  if (type === 'date') return formatDate(value, 'short-padded');
  if (type === 'number') return String(value);
  return translateValue(value);
}

function getAggFn(col) {
  return col?.type === 'currency' || col?.type === 'number' ? 'sum' : 'count';
}

export default function GroupedTable({ data, columns, groupBy, aggregateFields, allColumns }) {
  const [collapsed, setCollapsed] = useState(new Set());

  const groupByKey = groupBy.join(',');
  useEffect(() => { setCollapsed(new Set()); }, [groupByKey]);

  const grouped = useMemo(() => groupRows(data, groupBy), [data, groupBy]);

  const summaryAgg = useMemo(() => {
    if (!aggregateFields.length) return {};
    const specs = aggregateFields.map(f => {
      const col = allColumns.find(c => c.key === f);
      return { field: f, fn: getAggFn(col) };
    });
    return aggregate(data, specs);
  }, [data, aggregateFields, allColumns]);

  const toggle = (key) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderGroup = (group, depth) => {
    const key = `${depth}:${group.key}`;
    const isCollapsed = collapsed.has(key);
    const label = group.key === '(ריק)' ? '(ריק)' : translateValue(group.value);

    const rows = [
      <tr
        key={`header-${key}`}
        className="bg-muted/50 font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => toggle(key)}
      >
        <td colSpan={columns.length} className="px-3 py-2.5 whitespace-nowrap">
          <span className="flex items-center gap-1.5" style={{ paddingInlineStart: `${depth * 16}px` }}>
            <ChevronLeft className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isCollapsed ? '' : '-rotate-90'}`} />
            {label}
            <span className="text-[10px] text-muted-foreground font-normal">({group.count})</span>
          </span>
        </td>
      </tr>,
    ];

    if (!isCollapsed) {
      if (depth === 0 && group.children.length > 0) {
        group.children.forEach(sub => {
          rows.push(...renderGroup(sub, 1));
        });
      } else {
        group.rows.forEach((item, i) => {
          rows.push(
            <tr key={`row-${key}-${i}`} className="border-t border-border/50 hover:bg-muted/30">
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2 text-foreground/80 whitespace-nowrap">
                  {col.type === 'badge' ? <StatusBadge status={item[col.key]} /> : formatCell(item[col.key], col.type)}
                </td>
              ))}
            </tr>
          );
        });
      }
    }

    return rows;
  };

  return (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="text-right font-semibold text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grouped.flatMap(group => renderGroup(group, 0))}
          {/* Summary row */}
          <tr className="bg-muted border-t-2 border-border font-semibold">
            <td className="px-3 py-2.5 whitespace-nowrap">
              סיכום ({data.length})
            </td>
            {columns.slice(1).map(col => {
              if (aggregateFields.includes(col.key)) {
                const fn = getAggFn(col);
                return (
                  <td key={col.key} className="px-3 py-2.5 whitespace-nowrap text-foreground">
                    {formatAggregate(summaryAgg[col.key], fn, col.type)}
                  </td>
                );
              }
              return <td key={col.key} />;
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
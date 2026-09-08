import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TYPE_CONFIG } from './supportConfig';

// Chart token per ticket type — colors via design tokens only.
const TYPE_CHART_COLOR = {
  bug: 'hsl(var(--destructive))',
  improvement: 'hsl(var(--warning))',
  feature: 'hsl(var(--info))',
  other: 'hsl(var(--muted-foreground))',
};

// Compact donut of open tickets by type, with an inline legend.
export default function SupportTypePie({ tickets, size = 120 }) {
  const openTickets = tickets.filter(t => t.status !== 'resolved');
  const data = Object.keys(TYPE_CONFIG)
    .map(type => ({
      type,
      name: TYPE_CONFIG[type].label,
      value: openTickets.filter(t => t.type === type).length,
    }))
    .filter(d => d.value > 0);

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">אין פניות פתוחות</p>;
  }

  return (
    <div className="flex items-center gap-3" dir="rtl">
      <div style={{ width: size, height: size }} className="flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="95%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map(d => <Cell key={d.type} fill={TYPE_CHART_COLOR[d.type]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1 min-w-0">
        {data.map(d => (
          <div key={d.type} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_CHART_COLOR[d.type] }} />
            <span className="text-muted-foreground truncate">{d.name}</span>
            <span className="font-semibold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
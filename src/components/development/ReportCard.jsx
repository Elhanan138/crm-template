import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { getColorForKey } from './reportUtils';
import { formatDate } from '@/lib/formatDate';

function formatCell(value, format) {
 if (value === null || value === undefined || value === '') return '—';
 if (format === 'currency') return `₪${Number(value).toLocaleString('he-IL')}`;
 if (format === 'date') return formatDate(value, 'short-padded');
 return value;
}

export default function ReportCard({ title, icon: Icon, data, chartType = 'pie', details = [], columns = [] }) {
 const [expanded, setExpanded] = useState(false);
 const chartData = data.filter(d => d.value > 0);
 const total = chartData.reduce((sum, d) => sum + d.value, 0);
 const hasDetails = details.length > 0;

 return (
  <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md">
   {/* Header */}
   <div className="flex items-center gap-2.5 p-3 sm:p-4 pb-2.5">
    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
     <Icon className="w-[18px] h-[18px] text-primary"/>
    </div>
    <div className="min-w-0 flex-1">
     <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
     <p className="text-[11px] text-muted-foreground">{total} סה"כ</p>
    </div>
    {hasDetails && (
     <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
      {details.length}
     </span>
    )}
   </div>

   {/* Chart */}
   {chartData.length === 0 ? (
    <div className="h-[140px] sm:h-[160px] flex items-center justify-center text-sm text-muted-foreground">אין נתונים</div>
   ) : (
    <div className="px-3 sm:px-4 pb-3">
     <ResponsiveContainer width="100%"height={140}>
      {chartType === 'bar' ? (
       <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <XAxis dataKey="name"tick={{ fontSize: 10, fontFamily: 'Heebo' }} interval={0} angle={-15} textAnchor="end"height={40} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
        <Bar dataKey="value"radius={[4, 4, 0, 0]}>
         {chartData.map((d, i) => <Cell key={i} fill={getColorForKey(d.rawKey, i)} />)}
        </Bar>
       </BarChart>
      ) : (
       <PieChart>
        <Pie data={chartData} dataKey="value"nameKey="name"cx="50%"cy="50%"outerRadius={55} innerRadius={28} paddingAngle={2}>
         {chartData.map((d, i) => <Cell key={i} fill={getColorForKey(d.rawKey, i)} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Heebo' }} />
       </PieChart>
      )}
     </ResponsiveContainer>
    </div>
   )}

   {/* Expand button */}
   {hasDetails && (
    <>
     <button
      onClick={() => setExpanded(!expanded)}
      className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border text-xs font-medium text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
     >
      {expanded ? 'סגור פירוט' : 'פירוט'}
      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
     </button>
     {expanded && (
      <div className="border-t border-border max-h-[280px] overflow-y-auto">
       {/* Mobile: Card list */}
       <div className="sm:hidden divide-y divide-border/50">
        {details.slice(0, 50).map((item, i) => (
         <div key={item.id || i} className="p-3 space-y-1.5">
          {columns.map(col => (
           <div key={col.key} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground flex-shrink-0">{col.label}:</span>
            <span className="text-xs text-foreground/80 text-left min-w-0 truncate">
             {col.badge ? <StatusBadge status={item[col.key]} /> : formatCell(item[col.key], col.format)}
            </span>
           </div>
          ))}
         </div>
        ))}
       </div>
       {/* Desktop: Table */}
       <table className="hidden sm:block w-full text-xs">
        <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
         <tr>
          {columns.map(col => (
           <th key={col.key} className="text-right font-semibold text-muted-foreground px-3 py-2 whitespace-nowrap">
            {col.label}
           </th>
          ))}
         </tr>
        </thead>
        <tbody>
         {details.slice(0, 50).map((item, i) => (
          <tr key={item.id || i} className="border-t border-border/50 hover:bg-muted/30">
           {columns.map(col => (
            <td key={col.key} className="px-3 py-2 text-foreground/80 whitespace-nowrap">
             {col.badge ? <StatusBadge status={item[col.key]} /> : formatCell(item[col.key], col.format)}
            </td>
           ))}
          </tr>
         ))}
        </tbody>
       </table>
       {details.length > 50 && (
        <p className="text-center text-[10px] text-muted-foreground py-2">מציג 50 מתוך {details.length}</p>
       )}
      </div>
     )}
    </>
   )}
  </div>
 );
}
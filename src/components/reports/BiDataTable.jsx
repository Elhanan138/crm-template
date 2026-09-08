import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Settings2, ChevronDown, ChevronUp, Download, BarChart3, PieChart as PieIcon, X, SlidersHorizontal } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { getColorForKey } from '@/components/development/reportUtils';
import { translateValue } from './dataSources';
import { formatDate } from '@/lib/formatDate';
import GroupedTable from './GroupedTable';

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'currency') return `₪${Number(value).toLocaleString('he-IL')}`;
  if (type === 'date') return formatDate(value, 'short-padded');
  if (type === 'number') return String(value);
  return translateValue(value);
}

export default function BiDataTable({ dataSource, data, projectNames }) {
  const allColumns = dataSource.columns;
  const [visibleColumns, setVisibleColumns] = useState(allColumns.map(c => c.key));
  const [groupBy, setGroupBy] = useState([]);
  const [aggregateFields, setAggregateFields] = useState([]);
  const [showAggregateConfig, setShowAggregateConfig] = useState(false);
  const [chartType, setChartType] = useState('pie');
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const preparedData = useMemo(() => {
    return data.map(item => {
      const enriched = { ...item };
      if (item.project_id && projectNames[item.project_id]) {
        enriched.project_name = projectNames[item.project_id];
      }
      return enriched;
    });
  }, [data, projectNames]);

  const uniqueValuesMap = useMemo(() => {
    const map = {};
    allColumns.forEach(col => {
      const vals = new Set();
      preparedData.forEach(item => {
        const v = item[col.key];
        if (v !== null && v !== undefined && v !== '') vals.add(v);
      });
      map[col.key] = Array.from(vals).sort((a, b) => String(a).localeCompare(String(b), 'he'));
    });
    return map;
  }, [preparedData, allColumns]);

  const filteredData = useMemo(() => {
    return preparedData.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = item[key];
        if (itemValue === null || itemValue === undefined) return false;
        const rawStr = String(itemValue).toLowerCase();
        const translatedStr = translateValue(itemValue).toLowerCase();
        const filterStr = String(value).toLowerCase();
        return rawStr.includes(filterStr) || translatedStr.includes(filterStr);
      });
    });
  }, [preparedData, filters]);

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  const groupedData = useMemo(() => {
    if (!groupBy.length) return null;
    const groupKey = groupBy[0];
    const counts = {};
    filteredData.forEach(item => {
      const rawValue = item[groupKey];
      const key = rawValue === null || rawValue === undefined || rawValue === '' ? 'ללא' : translateValue(rawValue);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, groupBy]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (sortConfig.direction === 'asc') return String(aVal).localeCompare(String(bVal), 'he');
      return String(bVal).localeCompare(String(aVal), 'he');
    });
  }, [filteredData, sortConfig]);

  const activeColumns = allColumns.filter(c => visibleColumns.includes(c.key));
  const groupableColumns = allColumns.filter(c => c.groupable);
  const aggregatableColumns = allColumns.filter(c => c.aggregatable);

  useEffect(() => {
    setAggregateFields(allColumns.filter(c => c.aggregatable).map(c => c.key));
    setGroupBy([]);
  }, [dataSource.id]);

  const toggleColumn = (key) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportCSV = () => {
    const headers = activeColumns.map(c => c.label);
    const rows = sortedData.map(item =>
      activeColumns.map(c => {
        const val = item[c.key];
        if (val === null || val === undefined || val === '') return '';
        if (c.type === 'currency') return Number(val).toLocaleString('he-IL');
        if (c.type === 'badge') return translateValue(val);
        return String(val);
      })
    );
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataSource.id}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) {
    const Icon = dataSource.icon;
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-8 sm:p-12 text-center">
        <Icon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">אין נתונים להצגה עבור הסינון הנוכחי.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 sm:p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">קבץ לפי:</span>
          <select
            value={groupBy[0] || ''}
            onChange={(e) => setGroupBy(e.target.value ? [e.target.value] : [])}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm min-w-[100px]"
          >
            <option value="">ללא</option>
            {groupableColumns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {groupBy.length > 0 && (
            <select
              value={groupBy[1] || ''}
              onChange={(e) => setGroupBy(prev => {
                const first = prev[0];
                return e.target.value ? [first, e.target.value] : [first];
              })}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm min-w-[100px]"
            >
              <option value="">ואז...</option>
              {groupableColumns.filter(c => c.key !== groupBy[0]).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          )}
          {aggregatableColumns.length > 0 && groupBy.length > 0 && (
            <button
              onClick={() => setShowAggregateConfig(!showAggregateConfig)}
              className={`h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${showAggregateConfig ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Settings2 className="w-3.5 h-3.5" /> אגרגציה
            </button>
          )}
        </div>

        {groupBy && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChartType('pie')}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${chartType === 'pie' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <PieIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${chartType === 'bar' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`sm:hidden h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {activeFilterCount > 0 ? `סינון (${activeFilterCount})` : 'סינון'}
        </button>

        <button
          onClick={() => setShowColumnConfig(!showColumnConfig)}
          className={`h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${showColumnConfig ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Settings2 className="w-3.5 h-3.5" /> עמודות
        </button>

        <button
          onClick={exportCSV}
          className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors ms-auto"
        >
          <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">ייצוא CSV</span>
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilters({})}
            className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> נקה ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Column config */}
      {showColumnConfig && (
        <div className="p-2.5 sm:p-3 border-b border-border bg-muted/20">
          <div className="flex flex-wrap gap-2">
            {allColumns.map(col => {
              const visible = visibleColumns.includes(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                    visible
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted border-border text-muted-foreground opacity-60'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Aggregate config */}
      {showAggregateConfig && groupBy.length > 0 && aggregatableColumns.length > 0 && (
        <div className="p-2.5 sm:p-3 border-b border-border bg-muted/20">
          <div className="flex flex-wrap gap-2">
            {aggregatableColumns.map(col => {
              const selected = aggregateFields.includes(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => setAggregateFields(prev => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key])}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                    selected ? 'bg-accent text-accent-foreground' : 'bg-muted border-border text-muted-foreground opacity-60'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart (when grouped) */}
      {groupBy.length > 0 && groupedData && groupedData.length > 0 && (
        <div className="p-3 sm:p-4 border-b border-border">
          <ResponsiveContainer width="100%" height={200}>
            {chartType === 'bar' ? (
              <BarChart data={groupedData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Heebo' }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {groupedData.map((d, i) => <Cell key={i} fill={getColorForKey(d.name, i)} />)}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie data={groupedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {groupedData.map((d, i) => <Cell key={i} fill={getColorForKey(d.name, i)} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Heebo' }} />
              </PieChart>
            )}
          </ResponsiveContainer>

          {/* Group summary */}
          <div className="mt-3 max-h-[200px] overflow-y-auto rounded-lg border border-border/50">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                <tr>
                  <th className="text-right font-semibold text-muted-foreground px-3 py-2">{allColumns.find(c => c.key === groupBy)?.label}</th>
                  <th className="text-right font-semibold text-muted-foreground px-3 py-2 w-16">כמות</th>
                  <th className="text-right font-semibold text-muted-foreground px-3 py-2 w-16">אחוז</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.map((row, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2 text-foreground/80">{row.name}</td>
                    <td className="px-3 py-2 text-foreground/80 font-medium">{row.value}</td>
                    <td className="px-3 py-2 text-muted-foreground">{((row.value / filteredData.length) * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile filter panel */}
      {showFilters && (
        <div className="sm:hidden p-3 border-b border-border bg-muted/20 space-y-2">
          {activeColumns.map(col => {
            const uniqueVals = uniqueValuesMap[col.key] || [];
            const useDropdown = col.type === 'badge' || (col.type === 'text' && uniqueVals.length <= 30);
            return (
              <div key={col.key} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap w-20">{col.label}:</span>
                {useDropdown ? (
                  <select
                    value={filters[col.key] || ''}
                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                    className="flex-1 h-8 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value="">הכל</option>
                    {uniqueVals.map(val => (
                      <option key={val} value={val}>{translateValue(val)}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filters[col.key] || ''}
                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                    placeholder="סינון..."
                    className="flex-1 h-8 rounded border border-input bg-background px-2 text-xs"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile: Card list */}
      <div className="sm:hidden divide-y divide-border/50">
        {sortedData.slice(0, 100).map((item, i) => (
          <div key={item.id || i} className="p-3 space-y-1.5 hover:bg-muted/20">
            {activeColumns.map(col => (
              <div key={col.key} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{col.label}:</span>
                <span className="text-xs text-foreground/80 text-left min-w-0 truncate">
                  {col.type === 'badge' ? <StatusBadge status={item[col.key]} /> : formatCell(item[col.key], col.type)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: Grouped table (when grouping) or flat table */}
      {groupBy.length > 0 ? (
        <GroupedTable data={sortedData} columns={activeColumns} groupBy={groupBy} aggregateFields={aggregateFields} allColumns={allColumns} />
      ) : (
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {activeColumns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-right font-semibold text-muted-foreground px-3 py-2.5 whitespace-nowrap cursor-pointer hover:text-foreground"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Filter row */}
            <tr className="border-t border-border/50">
              {activeColumns.map(col => {
                const uniqueVals = uniqueValuesMap[col.key] || [];
                const useDropdown = col.type === 'badge' || (col.type === 'text' && uniqueVals.length <= 30);
                return (
                  <td key={col.key} className="px-2 py-1">
                    {useDropdown ? (
                      <select
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        className="w-full h-7 rounded border border-input bg-background px-1 text-xs"
                      >
                        <option value="">הכל</option>
                        {uniqueVals.map(val => (
                          <option key={val} value={val}>{translateValue(val)}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        placeholder="סינון..."
                        className="w-full h-7 rounded border border-input bg-background px-2 text-xs"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
            {/* Data rows */}
            {sortedData.slice(0, 100).map((item, i) => (
              <tr key={item.id || i} className="border-t border-border/50 hover:bg-muted/30">
                {activeColumns.map(col => (
                  <td key={col.key} className="px-3 py-2 text-foreground/80 whitespace-nowrap">
                    {col.type === 'badge' ? (
                      <StatusBadge status={item[col.key]} />
                    ) : formatCell(item[col.key], col.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sortedData.length > 100 && (
          <p className="text-center text-[10px] text-muted-foreground py-2">מציג 100 מתוך {sortedData.length}</p>
        )}
      </div>
      )}
    </div>
  );
}
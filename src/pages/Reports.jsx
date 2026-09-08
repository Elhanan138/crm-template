import React, { useState, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { withDerivedRows } from '@/lib/crm/derived';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { BarChart3, Filter } from 'lucide-react';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import BiDataTable from '@/components/reports/BiDataTable';
import { WORKSPACES } from '@/lib/modules';
import { buildReportSources, entityOf, groupSources } from '@/lib/reports/registry';
import { cleanEmail } from '@/lib/permissions';

const SOURCES = buildReportSources();

// Records that belong to a project are scoped by the project filter; the rest
// are global. Deciding this from the columns keeps it true for new modules too.
const isProjectScoped = (source) => source.columns.some((c) => c.key === 'project_name');

const GROUP_LABELS = { other: 'כללי' };

export default function Reports() {
  const { effectiveUser, isRealAdmin, canViewProject } = useAccessControl();
  const [projectFilter, setProjectFilter] = useState('all');

  const visibleSources = useMemo(
    () => SOURCES.filter((s) => !s.adminOnly || isRealAdmin),
    [isRealAdmin]
  );
  const [activeSourceId, setActiveSourceId] = useState(visibleSources[0]?.id);
  const activeSource = visibleSources.find((s) => s.id === activeSourceId) || visibleSources[0];

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.entities.Project.list(),
  });

  // One query per report source, so every module's data arrives without the
  // page knowing anything about which modules exist.
  const results = useQueries({
    queries: visibleSources.map((source) => ({
      queryKey: ['report-data', entityOf(source)],
      queryFn: () => api.entities[entityOf(source)].list(),
      staleTime: 30000,
    })),
  });

  const dataBySource = useMemo(() => {
    const map = {};
    visibleSources.forEach((source, i) => {
      // Derived columns are computed here, once, so the report table can filter,
      // group, total and export them exactly like stored ones.
      map[source.id] = withDerivedRows(CRM_SCHEMAS[source.module], results[i]?.data || []);
    });
    return map;
  }, [visibleSources, results]);

  const { data: globalTabRes } = useQuery({
    queryKey: ['global-tab-visibility'],
    queryFn: () => api.functions.invoke('globalTabVisibility', {}),
    retry: 2,
    meta: { silent: true },
  });
  const tabVisibility = globalTabRes?.data?.value || {};

  const accessibleProjects = useMemo(
    () => projects.filter((p) => canViewProject(p.id)),
    [projects, canViewProject]
  );
  const accessibleIds = useMemo(
    () => new Set(accessibleProjects.map((p) => p.id)),
    [accessibleProjects]
  );

  const projectNames = useMemo(() => {
    const map = {};
    projects.forEach((p) => { map[p.id] = p.client_name || p.name; });
    return map;
  }, [projects]);

  const rowsFor = (source) => {
    const rows = dataBySource[source.id] || [];
    if (source.id === 'projects') {
      return projectFilter === 'all'
        ? accessibleProjects
        : accessibleProjects.filter((p) => p.id === projectFilter);
    }
    if (source.id === 'tickets' && !isRealAdmin) {
      return rows.filter((t) => cleanEmail(t.submitted_by_email) === cleanEmail(effectiveUser?.email));
    }
    if (!isProjectScoped(source)) return rows;
    return projectFilter === 'all'
      ? rows.filter((r) => !r.project_id || accessibleIds.has(r.project_id))
      : rows.filter((r) => r.project_id === projectFilter);
  };

  const selectableSources = useMemo(
    () => visibleSources.filter((s) => {
      const map = { tasks: 'tasks', quotes: 'finance' };
      return !map[s.id] || tabVisibility[map[s.id]] !== false;
    }),
    [visibleSources, tabVisibility]
  );

  const grouped = useMemo(() => groupSources(selectableSources), [selectableSources]);
  const activeRows = activeSource ? rowsFor(activeSource) : [];

  if (loadingProjects) {
    return (
      <div dir="rtl">
        <PageHeader icon={BarChart3} title="מחולל דוחות" subtitle="ניתוח נתונים מקיף מכל המערכת" back />
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-accent border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (selectableSources.length === 0) {
    return (
      <div dir="rtl">
        <PageHeader icon={BarChart3} title="מחולל דוחות" subtitle="ניתוח נתונים מקיף מכל המערכת" back />
        <EmptyState icon={BarChart3} title="אין מקורות נתונים" description="לא נכלל בבנייה הזו מודול שניתן להפיק ממנו דוח." />
      </div>
    );
  }

  return (
    <div dir="rtl">
      <PageHeader
        icon={BarChart3}
        title="מחולל דוחות"
        subtitle={`${selectableSources.length} מקורות נתונים מכל מודולי המערכת`}
        back
      />

      {/* One compact control row. Twenty sources as seven rows of buttons pushed
          the table below the fold; a grouped dropdown keeps it at the top. */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={activeSource?.id} onValueChange={setActiveSourceId}>
          <SelectTrigger className="h-9 rounded-lg text-sm w-full sm:w-64">
            <SelectValue placeholder="בחר מקור נתונים" />
          </SelectTrigger>
          <SelectContent dir="rtl" className="max-h-[60vh]">
            {grouped.map(({ key, sources }) => (
              <SelectGroup key={key}>
                <SelectLabel className="text-[10px] text-muted-foreground">
                  {WORKSPACES[key]?.label || GROUP_LABELS[key] || key}
                </SelectLabel>
                {sources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    <span className="flex items-center gap-2">
                      {source.label}
                      <span className="text-[10px] text-muted-foreground">{rowsFor(source).length}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {activeSource && isProjectScoped(activeSource) && (
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9 rounded-lg text-sm w-full sm:w-56">
                <SelectValue placeholder="כל הפרויקטים" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">כל הפרויקטים</SelectItem>
                {accessibleProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.client_name || p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="hidden sm:flex items-center text-xs text-muted-foreground whitespace-nowrap">
          {activeRows.length.toLocaleString()} רשומות
        </span>
      </div>

      {activeSource && (
        <BiDataTable dataSource={activeSource} data={activeRows} projectNames={projectNames} />
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import {
 Settings as SettingsIcon, AlertTriangle,
} from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { NAV_ICONS } from '@/lib/navIcons';
import { Button } from '@/components/ui/button';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useLogo } from '@/lib/LogoContext';

import KpiCard from '@/components/shared/KpiCard';
import { KPI_ICONS, formatKpi } from '@/lib/kpi';
import { MyTasksToday, OpenTickets } from '@/components/dashboard/UserWidgets';
import QuickAccessConfig from '@/components/dashboard/widgetConfigs/QuickAccessConfig';
import { SupportPriority } from '@/components/dashboard/AdminWidgets';
import QuickAccessWidget from '@/components/dashboard/QuickAccessWidget';
import RequiresAttention from '@/components/dashboard/RequiresAttention';
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer';
import CardSkeleton from '@/components/shared/CardSkeleton';
import { selectMyTasks } from '@/lib/dashboardTasks';
import { getDisplayName } from '@/lib/displayName';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import ModuleWidget, { widgetableModules } from '@/components/dashboard/ModuleWidget';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { MODULES } from '@/lib/modules';

// span: 'full' = own row · 'half' = pairs into 2-col grid
// configurable: list of supported per-widget options (e.g. ['limit'])
// `module` ties a widget to the module that owns its data. A widget whose module
// is not part of this build disappears from the dashboard AND the customizer —
// no orphan card linking to a page that does not exist.
const WIDGETS = [
 { id: 'stats', title: 'כרטיסי נתונים', icon: CubeIcon, span: 'full' },
 { id: 'quick_access', title: 'גישה מהירה לפרויקטים', icon: CubeIcon, span: 'full', configurable: [], module: 'projects' },
 { id: 'requires_attention', title: 'דורש טיפול', icon: AlertTriangle, span: 'full', configurable: ['limit'], defaultLimit: 8, module: 'projects' },
 { id: 'my_tasks', title: 'המשימות שלי להיום', icon: NAV_ICONS.tasks, span: 'half', configurable: ['limit'], defaultLimit: 6, module: 'tasks' },
 { id: 'open_tickets', title: 'פניות תמיכה פתוחות', icon: NAV_ICONS.support, span: 'half', configurable: ['limit'], defaultLimit: 6, module: 'support' },
 { id: 'support_priority', title: 'ניהול פניות תמיכה — תעדוף גבוה', icon: NAV_ICONS.support, span: 'full', adminOnly: true, module: 'support' },
];
const WIDGET_TO_TAB = {
 my_tasks: 'tasks',
};
// Every schema-driven module contributes a widget of its own, generated from
// its schema. They are half-width and off by default, so the dashboard does not
// change for anyone who does not go looking for them in the customizer.
const MODULE_WIDGETS = widgetableModules(ACTIVE_MODULE_IDS).map(id => ({
 id: `module_${id}`,
 title: CRM_SCHEMAS[id].title,
 icon: NAV_ICONS[MODULES[id].icon],
 span: 'half',
 module: id,
 generated: true,
 defaultHidden: true,
}));

// Widgets whose module is missing from this bundle are dropped up front.
const AVAILABLE_WIDGETS = [...WIDGETS, ...MODULE_WIDGETS].filter(w => !w.module || ACTIVE_MODULE_IDS.includes(w.module));
const DEFAULT_ORDER = AVAILABLE_WIDGETS.map(w => w.id);

export default function Dashboard() {
 const { isRealAdmin, canViewProject, currentUser, teamMember, effectiveUser, isLoading: aclLoading, updateUser } = useAccessControl();
 const { logoUrl, systemName } = useLogo();
 const [customizerOpen, setCustomizerOpen] = useState(false);

 const prefs = currentUser?.dashboard_prefs || {};
 const savedOrder = Array.isArray(prefs.order) ? prefs.order : DEFAULT_ORDER;
 const order = [...savedOrder, ...DEFAULT_ORDER.filter(id => !savedOrder.includes(id))];
 // Generated module widgets start hidden: the dashboard stays exactly as it was
 // until someone turns one on in the customizer.
 const DEFAULT_HIDDEN = AVAILABLE_WIDGETS.filter(w => w.defaultHidden).map(w => w.id);
 const hidden = Array.isArray(prefs.hidden)
  ? [...prefs.hidden, ...DEFAULT_HIDDEN.filter(id => !savedOrder.includes(id))]
  : DEFAULT_HIDDEN;
 const options = prefs.options && typeof prefs.options === 'object' ? prefs.options : {};
 const pinnedProjects = Array.isArray(currentUser?.quick_access_projects) ? currentUser.quick_access_projects : [];

 const spanOf = (id) => {
  const w = AVAILABLE_WIDGETS.find(x => x.id === id);
  return options[id]?.span || w?.span || 'full';
 };

 const limitOf = (id) => {
  const w = AVAILABLE_WIDGETS.find(x => x.id === id);
  const base = options[id]?.limit || w?.defaultLimit || 5;
  return spanOf(id) === 'full' ? Math.min(base * 2, 12) : base;
 };

 const savePrefs = async (next) => {
  updateUser({ dashboard_prefs: next });
  await api.auth.updateMe({ dashboard_prefs: next });
 };

 const savePinned = async (ids) => {
  updateUser({ quick_access_projects: ids });
  await api.auth.updateMe({ quick_access_projects: ids });
 };

 const { data: allProjects = [], isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.entities.Project.list('-created_date'),
 });
 const projects = isRealAdmin ? allProjects : allProjects.filter(p => canViewProject(p.id));
 const visibleProjectIds = new Set(projects.map(p => p.id));

 // Projects where the current user is the project manager OR current liaison
 // (matched by team-member name). Tasks widgets are scoped to THESE only.
 const myName = (teamMember?.name || '').trim().toLowerCase();
 const myProjects = projects.filter(p => {
  if (isRealAdmin) return true;
  const pm = (p.project_manager || '').trim().toLowerCase();
  const liaison = (p.current_liaison || '').trim().toLowerCase();
  return myName && (pm === myName || liaison === myName);
 });
 const myProjectIds = new Set(myProjects.map(p => p.id));

 // Tasks are RLS-scoped to the current user, then further narrowed to projects
 // where the user is PM/liaison (or all projects for admins).
 const { data: tasks = [] } = useQuery({
  queryKey: ['dashboard-tasks'],
  queryFn: () => api.entities.Task.list('-created_date', 300),
 });
 const myTasks = selectMyTasks({
  tasks,
  myProjectIds,
  myName: teamMember?.name || '',
  myEmail: effectiveUser?.email || currentUser?.email || '',
 });
 // Projects needed to render task rows — includes projects for tasks assigned
 // to the user by name even if the user isn't PM/liaison there.
 const myTasksProjectIds = new Set(myTasks.map(t => t.project_id));
 const myTasksProjects = [
  ...myProjects,
  ...projects.filter(p => !myProjectIds.has(p.id) && myTasksProjectIds.has(p.id)),
 ];

 const { data: tickets = [] } = useQuery({
  queryKey: ['dashboard-tickets'],
  queryFn: () => api.entities.SupportTicket.list('-created_date', 100),
 });

 const { data: allProposals = [] } = useQuery({
  queryKey: ['dashboard-proposals'],
  queryFn: () => api.entities.Proposal.list('-created_date', 500),
 });
 const quotes = allProposals.filter(q => visibleProjectIds.has(q.project_id));

 const { data: globalTabRes } = useQuery({
  queryKey: ['global-tab-visibility'],
  queryFn: () => api.functions.invoke('globalTabVisibility', {}),
  retry: 2,
  meta: { silent: true },
 });
 const globalTabVisibility = globalTabRes?.data?.value || {};

 const myOpenTasks = myTasks.filter(t => t.status !== 'done').length;
 const myOverdueTasks = myTasks.filter(t => {
  if (t.status === 'done' || !t.due_date) return false;
  const d = new Date(t.due_date);
  return !isNaN(d) && d < new Date();
 }).length;
 const myUrgentTasks = myTasks.filter(t => t.status !== 'done' && t.priority === 'urgent').length;
 const myTasksTone = myOverdueTasks > 0 ? 'destructive' : myUrgentTasks > 0 ? 'warning' : 'neutral';
 const myTasksSub = myOverdueTasks > 0
  ? `${myOverdueTasks} באיחור`
  : myUrgentTasks > 0
   ? `${myUrgentTasks} דחופות`
   : 'אין משימות באיחור';

 const widgetNodes = useMemo(() => ({
  stats: (
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <KpiCard
     icon={KPI_ICONS.projects}
     value={formatKpi(projects.length, 'count')}
     label="סך הפרויקטים"
     tone="neutral"
     density="comfortable"
     to="/projects"
    />
    <KpiCard
     icon={KPI_ICONS.tasks}
     value={formatKpi(myOpenTasks, 'count')}
     label="משימות בטיפול שלי"
     sub={myTasksSub}
     tone={myTasksTone}
     density="comfortable"
     to="/tasks"
    />
    <KpiCard
     icon={KPI_ICONS.money}
     value={formatKpi(quotes.length, 'count')}
     label="הצעות מחיר"
     tone="neutral"
     density="comfortable"
     to="/proposals"
    />
    <KpiCard
     icon={KPI_ICONS.support}
     value={formatKpi(tickets.filter(t => t.status !== 'closed').length, 'count')}
     label="פניות פתוחות"
     tone="neutral"
     density="comfortable"
     to="/support"
    />
   </div>
  ),
  quick_access: <QuickAccessWidget projects={projects} pinnedIds={pinnedProjects} />,
  requires_attention: <RequiresAttention projects={projects} quotes={quotes} limit={limitOf('requires_attention')} />,
  my_tasks: <MyTasksToday tasks={myTasks} projects={myTasksProjects} limit={limitOf('my_tasks')} />,
  open_tickets: <OpenTickets tickets={tickets} limit={limitOf('open_tickets')} />,
  support_priority: isRealAdmin ? <SupportPriority tickets={tickets} /> : null,
  // Generated module cards — each reads its own entity.
  ...Object.fromEntries(MODULE_WIDGETS.map(w => [w.id, <ModuleWidget key={w.id} moduleId={w.module} />])),
 }), [projects, myProjects, myTasksProjects, myTasks, tickets, quotes, isRealAdmin, pinnedProjects, options, myOpenTasks, myTasksSub, myTasksTone]);

 // Widgets globally hidden via tab visibility settings — excluded from customizer and rendering.
 const globallyHiddenWidgets = AVAILABLE_WIDGETS.filter(w => WIDGET_TO_TAB[w.id] && globalTabVisibility[WIDGET_TO_TAB[w.id]] === false).map(w => w.id);

 // Attach per-widget preference panels (rendered inside the customizer sheet).
 const availableWidgets = AVAILABLE_WIDGETS.filter(w => (!w.adminOnly || isRealAdmin) && !globallyHiddenWidgets.includes(w.id)).map(w => {
  if (w.id === 'quick_access') {
   return { ...w, renderExtraConfig: () => <QuickAccessConfig projects={projects} pinnedIds={pinnedProjects} onSave={savePinned} /> };
  }
  return w;
 });
 if (isLoading || aclLoading) {
  return (
   <div dir="rtl"className="max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6">
    <div className="flex items-center gap-3">
     <Skeleton className="w-10 h-10 rounded-lg"/>
     <Skeleton className="h-8 w-32"/>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
     {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg"/>)}
    </div>
    <CardSkeleton count={4} />
   </div>
  );
 }

 // Ordered visible list → chunk into rows: 'full' = own row, 'half' = pairs of two.
 const visibleIds = order.filter(id => !hidden.includes(id) && widgetNodes[id] && !globallyHiddenWidgets.includes(id));
 const rows = [];
 for (let i = 0; i < visibleIds.length; i++) {
  const id = visibleIds[i];
  if (spanOf(id) === 'half') {
   const group = [id];
   if (i + 1 < visibleIds.length && spanOf(visibleIds[i + 1]) === 'half') group.push(visibleIds[++i]);
   rows.push({ type: 'half', ids: group });
  } else {
   rows.push({ type: 'full', ids: [id] });
  }
 }

 const hour = new Date().getHours();
 const greeting = hour >= 5 && hour < 12 ? 'בוקר טוב' : hour >= 12 && hour < 17 ? 'צהריים טובים' : hour >= 17 && hour < 22 ? 'ערב טוב' : 'לילה טוב';
 const fullName = getDisplayName(currentUser, teamMember);
 const todayStr = format(new Date(), "EEEE, d 'ב'MMMM", { locale: he });

 return (
  <div dir="rtl"className="max-w-[1600px] mx-auto px-4 sm:px-6">
   <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
    <div className="flex items-center gap-3 min-w-0">
     <img src={logoUrl} alt={systemName} className="w-10 h-10 rounded-lg object-contain flex-shrink-0"/>
     <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{greeting}{fullName ? <>, <bdi>{fullName}</bdi></> : ''}</h1>
      <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
     </div>
    </div>
    <Button
     variant="outline"
     size="icon"
     onClick={() => setCustomizerOpen(true)}
     title="הגדרות דף הבית"
     aria-label="הגדרות דף הבית"
     className="rounded-full h-10 w-10 border-border text-muted-foreground hover:bg-muted flex-shrink-0"
    >
     <SettingsIcon className="w-[18px] h-[18px]"/>
    </Button>
   </div>

   <div className="space-y-6">
    {rows.length === 0 ? (
     <div className="text-center py-16 bg-card rounded-lg border border-border">
      <p className="text-sm text-muted-foreground">כל הווידג'טים מוסתרים — פתח את ההגדרות כדי להציג אותם.</p>
     </div>
    ) : (
     rows.map((row, idx) =>
      row.type === 'half' ? (
       <div key={idx} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {row.ids.map(id => (
         <div key={id} className="min-w-0">{widgetNodes[id]}</div>
        ))}
       </div>
      ) : (
       <div key={idx} className="min-w-0">{widgetNodes[row.ids[0]]}</div>
      )
     )
    )}
   </div>

   <DashboardCustomizer
    open={customizerOpen}
    onClose={() => setCustomizerOpen(false)}
    widgets={availableWidgets}
    order={order.filter(id => availableWidgets.some(w => w.id === id))}
    hidden={hidden}
    options={options}
    onChange={savePrefs}
    onReset={() => savePrefs({ order: DEFAULT_ORDER, hidden: DEFAULT_HIDDEN, options: {} })}
   />
  </div>
 );
}

import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { CheckSquare, LifeBuoy, Clock, Calendar, FileText, Settings2, X, BarChart3, ChevronLeft } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import ReportCard from '@/components/development/ReportCard';
import { aggregate } from '@/components/development/reportUtils';
import KpiCard from '@/components/shared/KpiCard';
import { cleanEmail } from '@/lib/permissions';
import ReportsAIChat from '@/components/development/ReportsAIChat';

const VIS_KEY = 'userReportsVisibility';

const ALL_REPORTS = [
 { id: 'projects', label: 'הפרויקטים שלי', icon: CubeIcon, alwaysVisible: true },
 { id: 'tasks', label: 'המשימות שלי', icon: CheckSquare },
 { id: 'tickets_type', label: 'פניות לפי סוג', icon: LifeBuoy },
 { id: 'tickets_priority', label: 'פניות לפי עדיפות', icon: LifeBuoy },
 { id: 'meetings', label: 'מפגשים', icon: Calendar },
 { id: 'quotes', label: 'הצעות מחיר', icon: FileText },
];

export default function UserReports() {
 const navigate = useNavigate();
 const { effectiveUser, teamMember, isRealAdmin } = useAccessControl();
 const [showConfig, setShowConfig] = useState(false);

 const { data: user } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => api.auth.me(),
 });

 const myName = teamMember?.name || '';
 const myEmail = effectiveUser?.email || cleanEmail(user?.email);
 const myUserId = user?.id;

 const { data: tasks = [] } = useQuery({ queryKey: ['allTasks'], queryFn: () => api.entities.Task.list() });
 const { data: tickets = [] } = useQuery({ queryKey: ['allTickets'], queryFn: () => api.entities.SupportTicket.list() });
 const { data: meetings = [] } = useQuery({ queryKey: ['allMeetings'], queryFn: () => api.entities.MeetingLog.list() });
 const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.entities.Project.list() });
 const { data: quotes = [] } = useQuery({ queryKey: ['allQuotes'], queryFn: () => api.entities.Quote.list() });

 const [hiddenReports, setHiddenReports] = useState(() => {
  try {
   const saved = JSON.parse(localStorage.getItem(VIS_KEY));
   return Array.isArray(saved) ? saved : [];
  } catch { return []; }
 });

 useEffect(() => {
  try { localStorage.setItem(VIS_KEY, JSON.stringify(hiddenReports)); } catch { /* ignore */ }
 }, [hiddenReports]);

 const toggleReport = (id) => {
  setHiddenReports(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
 };

 const isVisible = (id) => !hiddenReports.includes(id);

 // Filter data strictly to the current user's own records.
 const myTasks = useMemo(
  () => tasks.filter(t => t.assigned_to === myName || t.created_by_id === myUserId),
  [tasks, myName, myUserId]
 );
 const myTickets = useMemo(
  () => tickets.filter(t => cleanEmail(t.submitted_by_email) === cleanEmail(myEmail)),
  [tickets, myEmail]
 );
 const myMeetings = useMemo(
  () => meetings.filter(m => m.implementers?.includes(myName) || m.created_by_id === myUserId),
  [meetings, myName, myUserId]
 );
 const myProjects = useMemo(
  () => isRealAdmin ? projects : projects.filter(p => p.project_manager === myName || p.current_liaison === myName || p.created_by_id === myUserId),
  [projects, isRealAdmin, myName, myUserId]
 );
 const myQuotes = useMemo(
  () => isRealAdmin ? quotes : quotes.filter(q => myProjects.some(p => p.id === q.project_id)),
  [quotes, myProjects, isRealAdmin]
 );

 const doneTasks = myTasks.filter(t => t.status === 'done').length;
 const openTickets = myTickets.filter(t => t.status !== 'resolved').length;
 const totalHours = myMeetings.filter(m => m.billable).reduce((sum, m) => sum + (m.effective_hours || 0), 0);
 const projectNames = useMemo(() => {
  const map = {};
  projects.forEach(p => { map[p.id] = p.client_name || p.name; });
  return map;
 }, [projects]);

 const hasData = myTasks.length > 0 || myTickets.length > 0 || myMeetings.length > 0 || myProjects.length > 0;

 if (!hasData) {
  return (
   <div className="bg-card rounded-lg border border-border shadow-sm p-12 text-center">
    <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3"/>
    <p className="text-sm text-muted-foreground">אין עדיין נתונים להצגה. כאשר תקבל משימות או תגיש פניות, הדוחות שלך יופיעו כאן.</p>
   </div>
  );
 }

 return (
  <div dir="rtl"className="space-y-5">
   <button
    onClick={() => navigate('/reports')}
    className="w-full flex items-center justify-between gap-3 bg-gradient-to-l from-primary/10 to-success/5 border border-primary/20 rounded-lg p-4 hover:from-primary/15 hover:to-success/10 transition-colors group"
   >
    <div className="flex items-center gap-3">
     <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
      <BarChart3 className="w-5 h-5 text-primary"/>
     </div>
     <div className="text-right">
      <p className="text-sm font-bold text-foreground">מחולל דוחות BI מלא</p>
      <p className="text-caption">ניתוח נתונים מקיף מכל המערכת</p>
     </div>
    </div>
    <ChevronLeft className="w-5 h-5 text-primary group-hover:-translate-x-1 transition-transform flex-shrink-0"/>
   </button>

   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <KpiCard icon={CubeIcon} value={myProjects.length} label="הפרויקטים שלי"tone="primary"density="compact"/>
    <KpiCard icon={CheckSquare} value={myTasks.length} label="המשימות שלי"sub={`${doneTasks} הושלמו`} tone="success"density="compact"/>
    <KpiCard icon={LifeBuoy} value={openTickets} label="פניות פתוחות"sub={`מתוך ${myTickets.length}`} tone="warning"density="compact"/>
    <KpiCard icon={Clock} value={totalHours.toFixed(1)} label="שעות הדרכה"sub={`${myMeetings.length} מפגשים`} tone="info"density="compact"/>
   </div>

   <div className="flex items-center justify-between gap-3">
    <h2 className="text-sm font-bold text-foreground">הדוחות שלי</h2>
    <Button variant="outline"size="sm"onClick={() => setShowConfig(!showConfig)} className="rounded-full gap-2 text-xs h-8">
     <Settings2 className="w-3.5 h-3.5"/> התאמת דוחות
    </Button>
   </div>

   {showConfig && (
    <div className="bg-card rounded-lg border border-border shadow-sm p-4">
     <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-foreground">בחר אילו דוחות להציג</p>
      <button onClick={() => setShowConfig(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted">
       <X className="w-3.5 h-3.5 text-muted-foreground"/>
      </button>
     </div>
     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {ALL_REPORTS.map(r => {
       const Icon = r.icon;
       const visible = isVisible(r.id);
       return (
        <button
         key={r.id}
         onClick={() => !r.alwaysVisible && toggleReport(r.id)}
         disabled={r.alwaysVisible}
         className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
          visible
           ? 'bg-accent text-accent-foreground'
           : 'bg-muted border-border text-muted-foreground opacity-60'
         } ${r.alwaysVisible ? 'cursor-default' : 'cursor-pointer hover:bg-primary/10'}`}
        >
         <Icon className="w-3.5 h-3.5 flex-shrink-0"/>
         <span className="truncate">{r.label}</span>
         {r.alwaysVisible && <span className="text-[9px] text-muted-foreground ms-auto">תמיד</span>}
        </button>
       );
      })}
     </div>
    </div>
   )}

   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {isVisible('projects') && myProjects.length > 0 && (
     <ReportCard
      title="הפרויקטים שלי לפי מודל תמחור"
      icon={CubeIcon}
      data={aggregate(myProjects, 'pricing_model')}
      details={myProjects}
      columns={[
       { key: 'name', label: 'פרויקט' },
       { key: 'client_name', label: 'לקוח' },
       { key: 'pricing_model', label: 'מודל', badge: true },
      ]}
     />
    )}
    {isVisible('tasks') && myTasks.length > 0 && (
     <ReportCard
      title="המשימות שלי לפי סטטוס"
      icon={CheckSquare}
      data={aggregate(myTasks, 'status')}
      details={myTasks.map(t => ({ ...t, project_name: projectNames[t.project_id] || '—' }))}
      columns={[
       { key: 'title', label: 'משימה' },
       { key: 'project_name', label: 'פרויקט' },
       { key: 'status', label: 'סטטוס', badge: true },
       { key: 'priority', label: 'עדיפות', badge: true },
       { key: 'due_date', label: 'תאריך', format: 'date' },
      ]}
     />
    )}
    {isVisible('tickets_type') && myTickets.length > 0 && (
     <ReportCard
      title="הפניות שלי לפי סוג"
      icon={LifeBuoy}
      data={aggregate(myTickets, 'type')}
      details={myTickets}
      columns={[
       { key: 'title', label: 'כותרת' },
       { key: 'type', label: 'סוג', badge: true },
       { key: 'priority', label: 'עדיפות', badge: true },
       { key: 'status', label: 'סטטוס', badge: true },
      ]}
     />
    )}
    {isVisible('tickets_priority') && myTickets.length > 0 && (
     <ReportCard
      title="הפניות שלי לפי עדיפות"
      icon={LifeBuoy}
      data={aggregate(myTickets, 'priority')}
      chartType="bar"
      details={myTickets}
      columns={[
       { key: 'title', label: 'כותרת' },
       { key: 'type', label: 'סוג', badge: true },
       { key: 'priority', label: 'עדיפות', badge: true },
       { key: 'status', label: 'סטטוס', badge: true },
      ]}
     />
    )}
    {isVisible('meetings') && myMeetings.length > 0 && (
     <ReportCard
      title="המפגשים שלי לפי סוג"
      icon={Calendar}
      data={aggregate(myMeetings, 'type')}
      details={myMeetings.map(m => ({ ...m, project_name: projectNames[m.project_id] || '—' }))}
      columns={[
       { key: 'title', label: 'מפגש' },
       { key: 'project_name', label: 'פרויקט' },
       { key: 'type', label: 'סוג', badge: true },
       { key: 'date', label: 'תאריך', format: 'date' },
      ]}
     />
    )}
    {isVisible('quotes') && myQuotes.length > 0 && (
     <ReportCard
      title="הצעות מחיר בפרויקטים שלי"
      icon={FileText}
      data={aggregate(myQuotes, 'status')}
      details={myQuotes.map(q => ({ ...q, project_name: projectNames[q.project_id] || '—' }))}
      columns={[
       { key: 'title', label: 'הצעה' },
       { key: 'project_name', label: 'פרויקט' },
       { key: 'status', label: 'סטטוס', badge: true },
       { key: 'amount', label: 'סכום', format: 'currency' },
      ]}
     />
    )}
   </div>

   <ReportsAIChat />
  </div>
 );
}
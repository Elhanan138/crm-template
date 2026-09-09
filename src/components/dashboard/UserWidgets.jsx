import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Check } from 'lucide-react';
import WidgetShell, { WidgetEmpty } from './WidgetShell';
import { NAV_ICONS } from '@/lib/navIcons';
import { useTaskMutations } from '@/hooks/useTaskMutations';
import { ticketAgeDays, ticketAgeTone, groupTicketsByType, flattenGroups } from '@/lib/ticketAge';
import { useProjectPath } from '@/lib/useProjectFromUrl';

const TASK_STATUS = {
 not_started: { label: 'טרם התחיל', color: 'bg-muted text-muted-foreground' },
 in_progress: { label: 'בטיפול', color: 'bg-info-muted text-info' },
 stuck: { label: 'תקוע', color: 'bg-destructive/10 text-destructive' },
 done: { label: 'הושלם', color: 'bg-success-muted text-success' },
};

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

// Bucket: 0=overdue, 1=today, 2=upcoming, 3=no-date
function dateBucket(dueDate, today) {
 if (!dueDate) return 3;
 const d = new Date(dueDate);
 if (isNaN(d.getTime())) return 3;
 const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
 if (dDay.getTime() < today.getTime()) return 0;
 if (dDay.getTime() === today.getTime()) return 1;
 return 2;
}

/* ---------- Tasks completion donut ---------- */
function TasksDonut({ tasks }) {
 const done = tasks.filter(t => t.status === 'done').length;
 const open = tasks.filter(t => t.status !== 'done').length;
 const total = done + open;
 if (total === 0) return null;
 const pct = Math.round((done / total) * 100);
 const data = [
  { name: 'הושלמו', value: done, color: 'hsl(var(--primary))' },
  { name: 'פתוחות', value: open, color: 'hsl(200 70% 50%)' },
 ].filter(d => d.value > 0);

 return (
  <div className="flex items-center gap-4 rounded-lg bg-muted/20 border border-border/70 p-3 mb-3">
   <div className="relative w-[78px] h-[78px] flex-shrink-0">
    <ResponsiveContainer width="100%"height="100%">
     <PieChart>
      <Pie data={data} dataKey="value"innerRadius={24} outerRadius={36} paddingAngle={1} stroke="none"startAngle={90} endAngle={-270}>
       {data.map((e, i) => <Cell key={i} fill={e.color} />)}
      </Pie>
      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} formatter={(v, n) => [`${v} משימות`, n]} />
     </PieChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
     <span className="text-base font-bold text-primary leading-none">{pct}%</span>
     <span className="text-[9px] text-muted-foreground">הושלמו</span>
    </div>
   </div>
   <div className="min-w-0 text-xs space-y-1 flex-1">
    {data.map(d => (
     <div key={d.name} className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"style={{ background: d.color }} />
      <span className="text-muted-foreground">{d.name}</span>
      <span className="font-bold text-foreground ms-auto">{d.value}</span>
     </div>
    ))}
   </div>
  </div>
 );
}

/* ---------- My tasks for today ---------- */
export function MyTasksToday({ tasks, projects, limit = 6 }) {
  const { updateMutation } = useTaskMutations();
  const [recentlyCompleted, setRecentlyCompleted] = useState([]);
  const projName = {};
  projects.forEach(p => { projName[p.id] = p.client_name || p.name; });
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const allItems = tasks
   .map(t => ({ ...t, _bucket: dateBucket(t.due_date, todayMidnight) }))
   .sort((a, b) => {
    if (a._bucket !== b._bucket) return a._bucket - b._bucket;
    const ap = PRIORITY_ORDER[a.priority] ?? 4;
    const bp = PRIORITY_ORDER[b.priority] ?? 4;
    if (ap !== bp) return ap - bp;
    const aD = a.due_date ? new Date(a.due_date).getTime() : null;
    const bD = b.due_date ? new Date(b.due_date).getTime() : null;
    if (aD == null && bD == null) return 0;
    if (aD == null) return 1;
    if (bD == null) return -1;
    return aD - bD;
   });

  // Show non-done tasks + recently completed ones (still within 2s fade window)
  const visibleItems = allItems.filter(t => t.status !== 'done' || recentlyCompleted.includes(t.id));
  const items = visibleItems.slice(0, limit);
  const openCount = allItems.filter(t => t.status !== 'done').length;
  const shownOpenCount = items.filter(t => t.status !== 'done').length;
  const projectPath = useProjectPath();

 const toggleTask = (task, e) => {
  e.preventDefault();
  e.stopPropagation();
  const newStatus = task.status === 'done' ? 'in_progress' : 'done';
  if (newStatus === 'done') {
   setRecentlyCompleted(prev => [...prev, task.id]);
   setTimeout(() => {
    setRecentlyCompleted(prev => prev.filter(id => id !== task.id));
   }, 2000);
  }
  updateMutation.mutate({ id: task.id, data: { status: newStatus } });
 };

 return (
  <WidgetShell title="המשימות שלי להיום"subtitle="בפרויקטים שלי"icon={NAV_ICONS.tasks} to="/tasks"overflow={Math.max(0, openCount - limit)}>
   <TasksDonut tasks={allItems} />
   {items.length === 0 ? <WidgetEmpty text="אין משימות פתוחות להיום 🎉"/> : (
    <div className="space-y-1.5">
     {items.map(t => {
      const isDone = t.status === 'done';
      const isFading = isDone && recentlyCompleted.includes(t.id);
      const st = TASK_STATUS[t.status] || TASK_STATUS.in_progress;
      return (
       <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5 hover:border-primary/30 hover:bg-accent/30 transition-all"style={isFading ? { animation: 'fade-row 2s ease-out forwards' } : undefined}>
        <span className={`text-[10px] font-semibold flex-shrink-0 px-2 py-1 rounded-md ${st.color}`}>{st.label}</span>
        <Link to={`${projectPath(t.project_id)}?tab=tasks`} className="min-w-0 flex-1">
         <p className={`text-sm truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>{t.title}</p>
         <p className="text-[11px] text-muted-foreground truncate">{projName[t.project_id] || '—'}</p>
        </Link>
        <button
         type="button"
         onClick={(e) => toggleTask(t, e)}
         disabled={updateMutation.isPending}
         className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? 'bg-success border-success text-success-foreground' : 'border-border hover:border-success'}`}
         title={isDone ? 'סמן כלא הושלם' : 'סמן כהושלם'}
        >
         {isDone && <Check className="w-3.5 h-3.5"/>}
        </button>
       </div>
      );
     })}
    </div>
   )}
  </WidgetShell>
 );
}

/* ---------- Open support tickets ---------- */
const TICKET_STATUS = { open: { label: 'פתוח', color: 'bg-accent text-accent-foreground' }, in_review: { label: 'בבדיקה', color: 'bg-warning-muted text-warning' } };

export function OpenTickets({ tickets, limit = 6 }) {
 const allItems = tickets.filter(t => t.status === 'open' || t.status === 'in_review');
 const groups = groupTicketsByType(allItems);
 const flatTickets = flattenGroups(groups, limit);
 const totalCount = allItems.length;
 const shownCount = flatTickets.length;

 // Build a set of shown ticket ids for per-group filtering
 const shownIds = new Set(flatTickets.map(t => t.id));

 return (
  <WidgetShell title="פניות תמיכה פתוחות"icon={NAV_ICONS.support} to="/support"accent="amber"overflow={Math.max(0, totalCount - shownCount)}>
   {shownCount === 0 ? <WidgetEmpty text="אין פניות תמיכה פתוחות"/> : (
    <div className="space-y-3">
     {groups.map(g => {
      const visible = g.tickets.filter(t => shownIds.has(t.id));
      if (visible.length === 0) return null;
      return (
       <div key={g.type}>
        <div className="flex items-center gap-2 mb-1.5">
         <span className="text-[11px] font-semibold text-foreground">{g.label}</span>
         <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{g.count}</span>
        </div>
        <div className="space-y-1.5">
         {visible.map(t => {
          const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
          const age = ticketAgeDays(t);
          const tone = ticketAgeTone(age);
          return (
           <Link key={t.id} to={`/support?ticket=${t.id}`} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5 hover:border-warning hover:bg-warning-muted/50 transition-all">
            <span className={`text-[9px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-md ${tone.className}`}>{tone.label}</span>
            <div className="min-w-0 flex-1">
             <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
             <p className="text-[11px] text-muted-foreground truncate">{t.submitted_by || '—'}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${st.color}`}>{st.label}</span>
           </Link>
          );
         })}
        </div>
       </div>
      );
     })}
    </div>
   )}
  </WidgetShell>
 );
}
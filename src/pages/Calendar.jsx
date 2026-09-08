import React, { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subDays,
  addMonths, subMonths, isSameMonth, isSameDay, parseISO, isValid,
  addWeeks, subWeeks, format,
} from 'date-fns';
import { formatDate } from '@/lib/formatDate';
import {
  CalendarDays, ChevronRight, ChevronLeft, Calendar as CalendarIcon, List,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { NAV_ICONS } from '@/lib/navIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccessControl } from '@/hooks/useAccessControl';
import { getProjectPath } from '@/lib/projectSlug';
import { useOutlookCalendarConfig, useOutlookCalendarEvents } from '@/hooks/useOutlookCalendar';
import { useAuth } from '@/lib/AuthContext';
import OutlookEventChip from '@/components/calendar/OutlookEventChip';
import DaySheet from '@/components/calendar/DaySheet';
import CalendarFilterButton from '@/components/calendar/CalendarFilterButton';
import {
  HOUR_START, HOUR_END, ROW_HEIGHT,
  TimeAxisColumn, HourGridLines, CurrentTimeLine, eventHourDecimal,
  eventEndHourDecimal,
} from '@/components/calendar/TimeAxisGrid';
import {
  EVENT_TYPES, eventCategory, eventTone,
  TONE_CHIP_CLASSES, tabForEvent,
} from '@/lib/calendarEventTypes';

const VIEWS = [
  { id: 'month', label: 'חודש', icon: CalendarDays },
  { id: 'week', label: 'שבוע', icon: CalendarIcon },
  { id: 'agenda', label: 'יום', icon: List },
];

const parseDate = (d) => {
  if (!d) return null;
  try {
    const parsed = typeof d === 'string' ? parseISO(d) : new Date(d);
    return isValid(parsed) ? parsed : null;
  } catch { return null; }
};

export default function Calendar() {
  const { user } = useAuth();
  const savedFilters = user?.ui_prefs?.calendar_filters;

  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState('week');
  const [disabledTypes, setDisabledTypes] = useState(() => {
    const saved = savedFilters?.disabledTypes;
    if (Array.isArray(saved)) return new Set(saved);
    return new Set();
  });
  const [disabledProjects, setDisabledProjects] = useState(() => new Set(savedFilters?.disabledProjects || []));
  const [daySheetDate, setDaySheetDate] = useState(null);
  const { canViewProject, isLoading: aclLoading } = useAccessControl();

  // Date range for queries: visible window + 1 month buffer each side
  const rangeStart = useMemo(() => format(subMonths(startOfMonth(cursor), 1), 'yyyy-MM-dd'), [cursor]);
  const rangeEnd = useMemo(() => format(addMonths(endOfMonth(cursor), 1), 'yyyy-MM-dd'), [cursor]);

  const { data: projects = [], isLoading: lp } = useQuery({ queryKey: ['projects'], queryFn: () => api.entities.Project.list('-created_date') });
  const { data: milestones = [], isLoading: lm } = useQuery({
    queryKey: ['milestones', rangeStart, rangeEnd],
    queryFn: () => api.entities.Milestone.filter({ target_date: { $gte: rangeStart, $lte: rangeEnd } }),
  });
  const { data: tasks = [], isLoading: lt } = useQuery({
    queryKey: ['tasks', rangeStart, rangeEnd],
    queryFn: () => api.entities.Task.filter({ due_date: { $gte: rangeStart, $lte: rangeEnd } }),
  });
  const { data: reminders = [], isLoading: lr } = useQuery({
    queryKey: ['reminders', rangeStart, rangeEnd],
    queryFn: () => api.entities.Reminder.filter({ reminder_date: { $gte: rangeStart, $lte: rangeEnd } }),
  });
  const { data: quotes = [], isLoading: lq } = useQuery({
    queryKey: ['quotes', rangeStart, rangeEnd],
    queryFn: () => api.entities.Quote.filter({ follow_up_date: { $gte: rangeStart, $lte: rangeEnd } }),
  });
  const { data: meetings = [], isLoading: lmt } = useQuery({
    queryKey: ['meetings', rangeStart, rangeEnd],
    queryFn: () => api.entities.MeetingLog.filter({ date: { $gte: rangeStart, $lte: rangeEnd } }),
  });

  const { data: outlookConfig = {} } = useOutlookCalendarConfig();
  const outlookEnabled = outlookConfig.enabled && outlookConfig.connected && outlookConfig.userVisible !== false;
  const outlookEventsQuery = useOutlookCalendarEvents(outlookEnabled, { start: rangeStart, end: rangeEnd });
  const outlookEvents = outlookEventsQuery.data || [];
  const outlookError = outlookEventsQuery.isError;

  const loading = aclLoading || lp || lm || lt || lr || lq || lmt;

  const visibleProjects = useMemo(
    () => projects.filter(p => canViewProject(p.id)),
    [projects, canViewProject]
  );
  const visibleIds = useMemo(() => new Set(visibleProjects.map(p => p.id)), [visibleProjects]);

  // Project Map for O(1) lookups instead of .find() in loops
  const projectMap = useMemo(() => new Map(visibleProjects.map(p => [p.id, p])), [visibleProjects]);
  const projectName = (id) => { const p = projectMap.get(id); return p?.client_name || p?.name || ''; };
  const projectPath = (id) => { const p = projectMap.get(id); return p ? getProjectPath(p) : `/projects/${id}`; };

  const toggleProject = (id) => {
    setDisabledProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllProjects = () => setDisabledProjects(new Set());
  const deselectAllProjects = () => setDisabledProjects(new Set(visibleProjects.map(p => p.id)));
  const toggleType = (cat) => {
    setDisabledTypes(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Persist disabledTypes and disabledProjects to User.ui_prefs.calendar_filters
  const skipSaveRef = useRef(true);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    const u = userRef.current;
    if (!u) return;
    const currentPrefs = u.ui_prefs || {};
    api.auth.updateMe({ ui_prefs: { ...currentPrefs, calendar_filters: { disabledTypes: [...disabledTypes], disabledProjects: [...disabledProjects] } } });
  }, [disabledTypes, disabledProjects]);

  const events = useMemo(() => {
    const out = [];
    const push = (date, type, title, projectId, time) => {
      const d = parseDate(date);
      if (!d) return;
      if (projectId && !visibleIds.has(projectId)) return;
      if (projectId && disabledProjects.has(projectId)) return;
      out.push({ date: d, type, title, projectId, time: time || null });
    };
    for (const p of visibleProjects) {
      push(p.kickoff_date, 'kickoff', `קיקאוף — ${p.client_name || p.name}`, p.id);
      push(p.go_live_date, 'go_live', `עלייה לאוויר — ${p.client_name || p.name}`, p.id);
      push(p.licensing_reminder_date, 'licensing', `תזכורת רישוי — ${p.client_name || p.name}`, p.id);
      push(p.licensing_start_date, 'licensing', `תחילת חיוב רישוי — ${p.client_name || p.name}`, p.id);
      push(p.frozen_until, 'frozen', `סיום הקפאה — ${p.client_name || p.name}`, p.id);
    }
    for (const m of milestones) push(m.target_date, 'milestone', `${m.name} — ${projectName(m.project_id)}`, m.project_id);
    for (const t of tasks) push(t.due_date, 'task', `${t.title} — ${projectName(t.project_id)}`, t.project_id);
    for (const mt of meetings) push(mt.date, 'meeting', `${mt.title} — ${projectName(mt.project_id)}`, mt.project_id, mt.start_time);
    for (const r of reminders) push(r.reminder_date, 'reminder', r.message || 'תזכורת', r.project_id, r.reminder_time);
    for (const q of quotes) push(q.follow_up_date, 'quote_followup', `מעקב הצעה: ${q.title} — ${projectName(q.project_id)}`, q.project_id);
    for (const oe of outlookEvents) {
      const d = parseDate(oe.start);
      if (d) out.push({ date: d, type: 'outlook', title: oe.subject || '(ללא כותרת)', projectId: null, time: null, outlookData: oe });
    }
    return out.filter(e => !disabledTypes.has(eventCategory(e.type)));
  }, [visibleProjects, milestones, tasks, meetings, reminders, quotes, outlookEvents, visibleIds, disabledProjects, disabledTypes, projectMap]);

  // Sort events within a day: timed events first (ascending), then date-only
  const sortDayEvents = (dayEvents) => {
    return [...dayEvents].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  };

  const filteredEvents = events;

  const goPrev = () => {
    if (view === 'month') setCursor(subMonths(cursor, 1));
    else if (view === 'week') setCursor(subWeeks(cursor, 1));
    else if (view === 'agenda') setCursor(subDays(cursor, 1));
  };
  const goNext = () => {
    if (view === 'month') setCursor(addMonths(cursor, 1));
    else if (view === 'week') setCursor(addWeeks(cursor, 1));
    else if (view === 'agenda') setCursor(addDays(cursor, 1));
  };

  const headerLabel = useMemo(() => {
    if (view === 'month') return formatDate(cursor, 'month-year');
    if (view === 'week') {
      const s = startOfWeek(cursor, { weekStartsOn: 0 });
      const e = endOfWeek(cursor, { weekStartsOn: 0 });
      return `${formatDate(s, 'day-month-padded')} - ${formatDate(e, 'short-padded')}`;
    }
    if (view === 'agenda') return formatDate(cursor, 'day-full');
    return 'יום';
  }, [cursor, view]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const arr = [];
    let day = start;
    while (day <= end) { arr.push(day); day = addDays(day, 1); }
    return arr;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const eventsForDay = (day) => filteredEvents.filter(e => isSameDay(e.date, day));

  const EventChip = ({ e, showDate = false }) => {
    if (e.type === 'outlook') return <OutlookEventChip e={e} showDate={showDate} />;
    const cfg = EVENT_TYPES[e.type];
    const Icon = cfg?.icon || CalendarIcon;
    const chipClasses = TONE_CHIP_CLASSES[eventTone(e.type)];
    return (
      <Link to={e.projectId ? `${projectPath(e.projectId)}?tab=${tabForEvent(e.type)}` : '#'} className={`flex items-start gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${chipClasses} hover:opacity-80 transition-opacity w-full h-full`}>
        <Icon className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span className="line-clamp-2 leading-tight">{e.title}</span>
        {showDate && <span className="text-[10px] opacity-70 flex-shrink-0 mt-0.5 font-semibold">{formatDate(e.date, 'day-month-padded')}</span>}
      </Link>
    );
  };

  const renderEvent = (e, i) => <EventChip key={i} e={e} />;

  return (
    <div>
      <PageHeader
        icon={NAV_ICONS.calendar}
        title="יומן"
        subtitle="כל האירועים מכל הפרויקטים במקום אחד"
        actions={
          <CalendarFilterButton
            disabledTypes={disabledTypes}
            toggleType={toggleType}
            visibleProjects={visibleProjects}
            disabledProjects={disabledProjects}
            toggleProject={toggleProject}
            selectAllProjects={selectAllProjects}
            deselectAllProjects={deselectAllProjects}
          />
        }
      />

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-border flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setCursor(new Date())} className="h-8 px-3 rounded-full text-xs font-semibold text-primary border border-primary/30 hover:bg-accent transition-colors whitespace-nowrap">
              היום
            </button>
            <button onClick={goNext} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-section-title me-2 hidden sm:block">{headerLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-muted/60 rounded-full p-0.5">
              {VIEWS.map(v => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                      view === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <h2 className="text-section-title px-4 py-2 sm:hidden border-b border-border">{headerLabel}</h2>

        {outlookError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-warning-muted/50 border-b border-border text-xs text-warning">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>חיבור Outlook פג — התחבר מחדש בפרופיל</span>
          </div>
        )}

        {loading ? (
          <div className="p-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : view === 'month' ? (
          <>
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day, i) => {
                const dayEvents = eventsForDay(day);
                const inMonth = isSameMonth(day, cursor);
                const today = isSameDay(day, new Date());
                const sortedDayEvents = sortDayEvents(dayEvents);
                const timedEvents = sortedDayEvents.filter((e) => eventHourDecimal(e) !== null);
                return (
                  <div
                    key={i}
                    onClick={() => { if (dayEvents.length > 0 && window.innerWidth < 640) setDaySheetDate(day); }}
                    className={`relative min-h-[90px] sm:min-h-[160px] border-b border-l border-border p-1.5 sm:p-2 ${inMonth ? '' : 'bg-muted/20'} ${dayEvents.length > 0 ? 'cursor-pointer sm:cursor-default' : ''}`}
                  >
                    <div className={`text-[11px] sm:text-xs font-semibold mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {formatDate(day, 'day')}
                    </div>
                    {/* Desktop: mini hour grid */}
                    <div className="hidden sm:block relative" style={{ height: (HOUR_END - HOUR_START + 1) * 22 }}>
                      <div className="absolute inset-0">
                        {Array.from({ length: HOUR_END - HOUR_START + 2 }).map((_, hi) => (
                          <div key={hi} className="absolute left-0 right-0 border-t border-border/40" style={{ top: hi * 22 }} />
                        ))}
                      </div>
                      {timedEvents.slice(0, 4).map((e, idx) => {
                        const hourDec = eventHourDecimal(e);
                        const endDec = eventEndHourDecimal(e);
                        const top = Math.max(0, (hourDec - HOUR_START) * 22);
                        const height = Math.max(22, (endDec - hourDec) * 22);
                        return (
                          <div key={idx} className="absolute left-0.5 right-0.5 overflow-hidden" style={{ top, height }}>
                            <EventChip e={e} />
                          </div>
                        );
                      })}
                    </div>
                    {/* All-day events */}
                    {sortedDayEvents.filter((e) => eventHourDecimal(e) === null).length > 0 && (
                      <div className="hidden sm:block mt-1 space-y-0.5">
                        {sortedDayEvents.filter((e) => eventHourDecimal(e) === null).slice(0, 2).map((e, idx) => <EventChip key={idx} e={e} />)}
                      </div>
                    )}
                    {dayEvents.length > 4 && (
                      <button onClick={() => setDaySheetDate(day)} className="hidden sm:block text-[10px] text-primary hover:underline px-1.5 mt-0.5">
                        +{dayEvents.length - 4} נוספים
                      </button>
                    )}
                    {/* Mobile: compact badge */}
                    {dayEvents.length > 0 && (
                      <div className="sm:hidden flex items-center justify-center mt-1">
                        <span className="text-[10px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {dayEvents.length}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : view === 'week' ? (
          <div className="flex overflow-x-auto">
            {/* Time axis column (visual left in RTL) */}
            <TimeAxisColumn />
            {/* Day columns */}
            <div className="flex-1 grid grid-cols-7 min-w-[1050px]">
              {weekDays.map((day, i) => {
                const dayEvents = eventsForDay(day);
                const today = isSameDay(day, new Date());
                const timedEvents = sortDayEvents(dayEvents).filter((e) => eventHourDecimal(e) !== null);
                const allDayEvents = sortDayEvents(dayEvents).filter((e) => eventHourDecimal(e) === null);
                const gridHeight = (HOUR_END - HOUR_START + 1) * ROW_HEIGHT;
                return (
                  <div key={i} className={`relative border-b border-l border-border ${today ? 'bg-accent/30' : ''}`}>
                    {/* Day header */}
                    <div className="sticky top-0 z-20 bg-card border-b border-border py-1.5 flex items-center justify-center gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">{formatDate(day, 'weekday-narrow')}</span>
                      <span className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full ${today ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                        {formatDate(day, 'day')}
                      </span>
                    </div>
                    {/* Hour grid */}
                    <div className="relative" style={{ height: gridHeight }}>
                      <HourGridLines />
                      {today && <CurrentTimeLine />}
                      {timedEvents.map((e, idx) => {
                        const hourDec = eventHourDecimal(e);
                        const endDec = eventEndHourDecimal(e);
                        const top = Math.max(0, (hourDec - HOUR_START) * ROW_HEIGHT);
                        const height = Math.max(ROW_HEIGHT * 0.5, (endDec - hourDec) * ROW_HEIGHT);
                        return (
                          <div key={idx} className="absolute left-1 right-1 z-10 overflow-hidden" style={{ top, height }}>
                            <EventChip e={e} />
                          </div>
                        );
                      })}
                    </div>
                    {/* All-day events at bottom */}
                    {allDayEvents.length > 0 && (
                      <div className="border-t border-border p-1 space-y-1 bg-muted/20">
                        {allDayEvents.map((e, idx) => <EventChip key={idx} e={e} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex overflow-hidden">
            <TimeAxisColumn />
            <div className="flex-1 min-w-0">
              {/* Day header */}
              <div className="sticky top-0 z-20 bg-card border-b border-border py-2 flex items-center justify-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">{formatDate(cursor, 'day-full')}</span>
                <span className={`text-sm font-bold flex items-center justify-center w-7 h-7 rounded-full ${isSameDay(cursor, new Date()) ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {formatDate(cursor, 'day')}
                </span>
              </div>
              {/* Hour grid — single day */}
              {(() => {
                const dayEvents = sortDayEvents(eventsForDay(cursor));
                const timed = dayEvents.filter((e) => eventHourDecimal(e) !== null);
                const allDay = dayEvents.filter((e) => eventHourDecimal(e) === null);
                const gridHeight = (HOUR_END - HOUR_START + 1) * ROW_HEIGHT;
                const isToday = isSameDay(cursor, new Date());
                return (
                  <div className="relative" style={{ height: gridHeight }}>
                    <HourGridLines />
                    {isToday && <CurrentTimeLine />}
                    {timed.length === 0 && allDay.length === 0 && (
                      <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">אין אירועים ביום זה</p>
                    )}
                    {timed.map((e, idx) => {
                      const hourDec = eventHourDecimal(e);
                      const endDec = eventEndHourDecimal(e);
                      const top = Math.max(0, (hourDec - HOUR_START) * ROW_HEIGHT);
                      const height = Math.max(ROW_HEIGHT * 0.5, (endDec - hourDec) * ROW_HEIGHT);
                      return (
                        <div key={idx} className="absolute left-1 right-1 z-10 overflow-hidden" style={{ top, height }}>
                          <EventChip e={e} />
                        </div>
                      );
                    })}
                    {allDay.length > 0 && (
                      <div className="absolute left-1 right-1 bottom-0 space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground">כל היום</p>
                        {allDay.map((e, idx) => <EventChip key={idx} e={e} />)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <DaySheet
        open={!!daySheetDate}
        onOpenChange={(open) => !open && setDaySheetDate(null)}
        date={daySheetDate}
        events={daySheetDate ? sortDayEvents(eventsForDay(daySheetDate)) : []}
        renderEvent={renderEvent}
      />
    </div>
  );
}
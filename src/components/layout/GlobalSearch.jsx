import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { Command as CommandPrimitive } from 'cmdk';
import { Command, CommandList, CommandGroup, CommandItem } from '@/components/ui/command';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useIsMobile } from '@/hooks/use-mobile';
import { cleanEmail } from '@/lib/permissions';
import { normalizeHebrew, scoreMatch, freshnessBonus } from '@/lib/hebrewSearch';
import { getProjectPath } from '@/lib/projectSlug';
import { CRM_SEARCH_SOURCES, sourceForType, searchTextsOf } from '@/lib/crm/searchSources';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { useRecordViewer, visibleModuleRecords } from '@/lib/crm/visibility';
import { CheckSquare, Calendar, FileSignature,
  BookOpen, Users,
  Search, Clock, CornerDownLeft, X
} from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';

function scoreRecord(q, record, type) {
  let primary, secondary;
  switch (type) {
    case 'project':
      primary = [record.client_name, record.name];
      secondary = [(record.tags || []).join(' '), record.project_manager, record.current_liaison];
      break;
    case 'milestone':
      primary = record.name;
      secondary = [record.description, record.assigned_to];
      break;
    case 'task':
      primary = record.title;
      secondary = [record.description, record.assigned_to];
      break;
    case 'quote':
      primary = [record.proposal_number, record.client_name];
      secondary = [record.notes, record.status];
      break;
    case 'meeting':
      primary = record.title;
      secondary = [record.summary, record.attendees, (record.implementers || []).join(' ')];
      break;
    case 'guide':
      primary = record.title;
      secondary = [record.description, record.source_note];
      break;
    case 'member':
      primary = record.name;
      secondary = [record.role, record.email];
      break;
    default: return 0;
  }
  return scoreMatch(q, primary, ...secondary) + freshnessBonus(record);
}

// ── Match highlighting (case-insensitive fallback) ──
function Highlight({ text, query }) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.substring(0, idx)}
      <mark className="bg-accent text-accent-foreground rounded px-0.5 font-semibold">{text.substring(idx, idx + query.length)}</mark>
      {text.substring(idx + query.length)}
    </>
  );
}

const TYPE_META = {
  project:   { label: 'פרויקטים',  icon: CubeIcon,    color: 'text-primary',  tab: 'overview' },
  task:      { label: 'משימות',    icon: CheckSquare,      color: 'text-info',     tab: 'tasks' },
  quote:     { label: 'הצעות',     icon: FileSignature,    color: 'text-warning',  path: '/proposals' },
  meeting:   { label: 'פגישות',    icon: Calendar,         color: 'text-warning',  tab: 'meetings' },
  guide:     { label: 'מדריכים',   icon: BookOpen,         color: 'text-success',  path: '/guides', idParam: 'guideId' },
  member:    { label: 'אנשי צוות', icon: Users,            color: 'text-secondary', path: '/profile', idParam: 'memberId' },
};
// Schema-driven modules join the same table, derived rather than hand-listed.
for (const source of CRM_SEARCH_SOURCES) {
  TYPE_META[source.type] = {
    label: source.label,
    icon: source.icon,
    color: 'text-primary',
    path: source.path,
    crm: true,
  };
}

// Project-side types first — they are what most searches are for — then the
// modules, in the order the manifest declares them.
const TYPE_ORDER = [
  'project', 'task', 'quote', 'meeting', 'guide', 'member',
  ...CRM_SEARCH_SOURCES.map((s) => s.type),
];

export default function GlobalSearch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const { effectiveUser, isRealAdmin, canViewProject } = useAccessControl();
  const email = cleanEmail(effectiveUser?.email);

  // User prefs (shares cache with Sidebar)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });
  const dashboardPrefs = currentUser?.dashboard_prefs || {};
  const recentSearches = dashboardPrefs.recent_searches || [];

  const searchActive = open || mobileOpen;

  // Fetch entities only when search is active.
  // RLS handles permission filtering transparently.
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'], queryFn: () => api.entities.Project.list(),
    enabled: searchActive,
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ['allMilestones'], queryFn: () => api.entities.Milestone.list(),
    enabled: searchActive,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['allTasks'], queryFn: () => api.entities.Task.list(),
    enabled: searchActive,
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['allProposals'], queryFn: () => api.entities.Proposal.list(),
    enabled: searchActive,
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ['allMeetings'], queryFn: () => api.entities.MeetingLog.list(),
    enabled: searchActive,
  });
  const { data: guides = [] } = useQuery({
    queryKey: ['allGuides'], queryFn: () => api.entities.Guide.list(),
    enabled: searchActive,
  });
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['allTeamMembers'], queryFn: () => api.entities.TeamMember.list('name'),
    enabled: searchActive,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['allClients'], queryFn: () => api.entities.Client.list(),
    enabled: searchActive,
  });
  // One query per schema-driven module, sharing the cache key the module pages
  // already use — opening search does not refetch what a list just loaded.
  const crmResults = useQueries({
    queries: CRM_SEARCH_SOURCES.map((source) => ({
      queryKey: ['crm', source.entity],
      queryFn: () => api.entities[source.entity].list(),
      enabled: searchActive,
      staleTime: 30000,
    })),
  });
  // A stable reference keyed on what actually changed, so the scoring memo below
  // is not thrown away on every keystroke-driven re-render.
  const crmSignature = crmResults.map((r) => r.dataUpdatedAt ?? 0).join('|');
  const crmData = useMemo(() => crmResults.map((r) => r.data), [crmSignature]);
  const viewer = useRecordViewer();

  const clientMap = React.useMemo(() => {
    const map = {};
    (clients || []).forEach(c => { map[c.id] = c.company_name; });
    return map;
  }, [clients]);

  // Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isMobile) {
          setMobileOpen(true);
        } else {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile]);

  // Listen for open events from trigger buttons (mobile sidebar)
  useEffect(() => {
    const handler = () => {
      if (isMobile) {
        setMobileOpen(true);
      } else {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener('global-search-open', handler);
    return () => window.removeEventListener('global-search-open', handler);
  }, [isMobile]);

  // Clear query shortly after close
  useEffect(() => {
    if (!open && !mobileOpen) {
      const t = setTimeout(() => setQuery(''), 200);
      return () => clearTimeout(t);
    }
  }, [open, mobileOpen]);

  // Click outside to close (desktop)
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // ── Layer 2: Defense-in-depth client-side permission filter ──
  const canAccess = useCallback((record) => {
    if (isRealAdmin) return true;
    const memberEmails = Array.isArray(record.member_emails) ? record.member_emails : [];
    return memberEmails.some(e => cleanEmail(e) === email);
  }, [isRealAdmin, email]);

  // ── Search results grouped by type, scored and sorted by relevance ──
  const results = useMemo(() => {
    const q = normalizeHebrew(query);
    if (q.length < 2) return null;

    const projectIds = new Set(projects.filter(p => canViewProject(p.id)).map(p => p.id));

    // Enrich proposals with client_name for search scoring
    const enrichedQuotes = (quotes || []).map(q => ({ ...q, client_name: clientMap[q.client_id] || '' }));

    const buildGroup = (records, type, filterFn) =>
      (records || [])
        .filter(filterFn || (() => true))
        .map(record => ({ record, type, score: scoreRecord(q, record, type) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    const groups = {
      project: buildGroup(projects, 'project', p => canViewProject(p.id)),
      task: buildGroup(tasks, 'task', t => projectIds.has(t.project_id) && canAccess(t)),
      quote: buildGroup(enrichedQuotes, 'quote', qt => projectIds.has(qt.project_id) && canAccess(qt)),
      meeting: buildGroup(meetings, 'meeting', mt => projectIds.has(mt.project_id) && canAccess(mt)),
      guide: buildGroup(guides, 'guide'),
      member: buildGroup(teamMembers, 'member'),
    };

    // Schema-driven modules, scored on the fields they already declare and
    // filtered by the same visibility rule their own list obeys.
    CRM_SEARCH_SOURCES.forEach((source, i) => {
      const rows = visibleModuleRecords(source.moduleId, crmData[i], viewer, CRM_SCHEMAS);
      groups[source.type] = rows
        .map((record) => {
          const { primary, secondary } = searchTextsOf(source, record);
          return { record, type: source.type, score: scoreMatch(q, primary, ...secondary) + freshnessBonus(record) };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    });

    const allScored = Object.values(groups).flat();
    const leading = allScored.length > 0 ? allScored.reduce((max, item) => item.score > max.score ? item : max) : null;
    const showLeading = !!(leading && leading.score >= 70);

    const groupOrder = TYPE_ORDER
      .filter(type => groups[type] && groups[type].length > 0)
      .map(type => ({ type, topScore: groups[type][0]?.score || 0 }))
      .sort((a, b) => b.topScore - a.topScore);

    return { groups, leading, showLeading, groupOrder, totalCount: allScored.length };
  }, [query, projects, milestones, tasks, quotes, meetings, guides, teamMembers, clientMap, canViewProject, canAccess, crmData, viewer]);

  const totalCount = results?.totalCount ?? 0;

  // ── Save last_search + recent_project_ids to User.dashboard_prefs ──
  const savePrefs = useCallback(async (projectId) => {
    try {
      const me = await api.auth.me();
      const prefs = me.dashboard_prefs || {};
      const newPrefs = {
        ...prefs,
        recent_searches: query.trim()
          ? [{ text: query.trim(), ts: Date.now() }, ...(prefs.recent_searches || []).filter(s => s.text !== query.trim())].slice(0, 5)
          : prefs.recent_searches || [],
        recent_project_ids: projectId
          ? [projectId, ...(prefs.recent_project_ids || []).filter(id => id !== projectId)].slice(0, 4)
          : prefs.recent_project_ids || [],
      };
      await api.auth.updateMe({ dashboard_prefs: newPrefs });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch { /* ignore */ }
  }, [query, queryClient]);

  const handleSelect = (type, record) => {
    const meta = TYPE_META[type];
    // A module record opens where it lives, with its sheet already open.
    if (meta.crm) {
      navigate(`${meta.path}?recordId=${encodeURIComponent(record.id)}`);
      savePrefs(null);
      setOpen(false);
      setMobileOpen(false);
      return;
    }
    const projectId = type === 'project' ? record.id : record.project_id;
    if (meta.path) {
      const qs = meta.idParam ? `?${meta.idParam}=${record.id}` : '';
      navigate(`${meta.path}${qs}`);
    } else {
      const projectObj = type === 'project' ? record : projects.find(p => p.id === record.project_id);
      const basePath = projectObj ? getProjectPath(projectObj) : `/projects/${projectId}`;
      const params = type === 'project' ? `tab=${meta.tab}` : `tab=${meta.tab}&itemId=${record.id}`;
      navigate(`${basePath}?${params}`);
    }
    savePrefs(type === 'project' ? projectId : null);
    setOpen(false);
    setMobileOpen(false);
  };

  const projectLabel = (p) => p.client_name || p.name;

  // ── Shared item renderer (used by leading result and group items) ──
  const renderItem = (item, isLeading = false) => {
    const { record, type } = item;
    const meta = TYPE_META[type];
    const Icon = meta.icon;
    const source = meta.crm ? sourceForType(type) : null;
    const proj = type === 'project' ? record : projects.find(p => p.id === record.project_id);
    const title = source ? (record[source.titleField] || '—')
      : type === 'project' ? projectLabel(record) : (record.proposal_number || record.name || record.title || '');
    const sub = source ? (source.subtitleField ? record[source.subtitleField] : '')
      : type === 'project' ? record.name
      : type === 'guide' ? record.description
      : type === 'member' ? record.role
      : type === 'quote' ? (record.client_name || (proj ? projectLabel(proj) : ''))
      : (proj ? projectLabel(proj) : '');
    return (
      <CommandItem
        key={`${type}-${record.id}${isLeading ? '-leading' : ''}`}
        value={`${type}-${record.id}${isLeading ? '-leading' : ''}`}
        onSelect={() => handleSelect(type, record)}
        className={`min-h-[44px] cursor-pointer gap-3 transition-colors ${isLeading ? 'bg-accent ring-1 ring-primary/20 rounded-lg' : ''}`}
      >
        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            <Highlight text={title} query={query} />
          </p>
          {sub && sub !== title && (
            <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
          )}
        </div>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
          {meta.label}
        </span>
      </CommandItem>
    );
  };

  // ── Shared results renderer (used by both desktop and mobile) ──
  const renderResults = () => {
    if (!results) {
      if (recentSearches.length === 0) return null;
      return (
        <div className="p-1">
          <CommandGroup heading="חיפושים אחרונים" className="mb-1">
            {recentSearches.slice(0, 5).map((s, idx) => (
              <CommandItem
                key={`recent-search-${idx}`}
                value={`recent-search-${idx}`}
                onSelect={() => setQuery(s.text)}
                className="min-h-[44px] cursor-pointer"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{s.text}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </div>
      );
    }
    if (totalCount === 0) {
      return (
        <div className="py-10 text-center text-sm text-muted-foreground">
          לא נמצאו תוצאות עבור "{query}"
        </div>
      );
    }
    return (
      <>
        {results.showLeading && (
          <CommandGroup heading="תוצאה מובילה" className="mb-1">
            {renderItem(results.leading, true)}
          </CommandGroup>
        )}
        {results.groupOrder.map(({ type }) => {
          const allItems = results.groups[type] || [];
          const items = results.showLeading && results.leading.type === type
            ? allItems.filter(item => item !== results.leading)
            : allItems;
          if (items.length === 0) return null;
          const meta = TYPE_META[type];
          return (
            <CommandGroup key={type} heading={meta.label} className="mb-1">
              {items.map(item => renderItem(item))}
            </CommandGroup>
          );
        })}
      </>
    );
  };

  const renderFooter = () => {
    if (!results || totalCount === 0) return null;
    return (
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex-shrink-0">
        <span>{totalCount} תוצאות</span>
        <span className="flex items-center gap-2">
          <span>↑↓ ניווט</span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" /> פתיחה
          </span>
        </span>
      </div>
    );
  };

  // ── Desktop: input in TopBar center + absolute results panel ──
  if (!isMobile) {
    return (
      <div ref={containerRef} className="relative w-full max-w-md mx-auto">
        <Command shouldFilter={false} className="relative w-full h-auto bg-transparent overflow-visible rounded-none">
          {/* Input */}
          <div className="flex items-center h-9 px-3 rounded-lg border border-input bg-card hover:border-primary/30 transition-colors gap-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <CommandPrimitive.Input
              ref={inputRef}
              value={query}
              onValueChange={(v) => { setQuery(v); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
              placeholder="חיפוש..."
              className="flex w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Results panel — anchored below input */}
          {open && (results || recentSearches.length > 0) && (
            <div className="absolute top-full mt-1 right-0 left-0 min-w-full max-w-xl z-50 animate-slide-in rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
              <CommandList className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2">
                {renderResults()}
              </CommandList>
              {renderFooter()}
            </div>
          )}
        </Command>
      </div>
    );
  }

  // ── Mobile: top-anchored overlay via portal ──
  if (!mobileOpen) return null;
  return createPortal(
    <div className="fixed top-0 inset-x-0 z-50 animate-slide-in">
      <Command shouldFilter={false} className="w-full h-auto rounded-none bg-popover shadow-lg">
        {/* Input row — stays visible when keyboard is open */}
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border">
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <CommandPrimitive.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => { if (e.key === 'Escape') setMobileOpen(false); }}
            placeholder="חיפוש..."
            className="flex w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        {/* Results — scrollable */}
        <CommandList className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2">
          {renderResults()}
        </CommandList>
        {renderFooter()}
      </Command>
    </div>,
    document.body
  );
}
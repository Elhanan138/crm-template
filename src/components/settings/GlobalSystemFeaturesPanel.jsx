import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Bot, Bell, Loader2, Mail, FolderKanban, BarChart3 } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/features';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { APP_IDENTITY } from '@/lib/appIdentity';

const AGENT_LABEL = APP_IDENTITY.name ? `${APP_IDENTITY.name} Agent` : 'עוזר חכם';

// `feature` / `module` mean the row is hidden when that part was not compiled
// into this build — no toggle for something that does not exist.
const ALL_PAGE_FEATURES = [
 { id: 'blossom_agent', label: AGENT_LABEL, description: 'כפתור העוזר החכם בסרגל העליון וחלון הצ׳אט', icon: Bot, default: 'all', feature: 'agent' },
 { id: 'project_agent', label: 'עוזר חכם בפרויקט', description: 'חלון הצ׳אט בלשונית הסקירה של פרויקט', icon: FolderKanban, default: 'all', feature: 'agent', module: 'projects' },
 { id: 'reports_agent', label: 'עוזר חכם בדוחות', description: 'שאילתות חופשיות מעל נתוני הדוחות', icon: BarChart3, default: 'all', feature: 'agent', module: 'reports' },
 { id: 'email_tracking', label: 'מעקב מיילים', description: 'עמוד תיבת היוצא בפרופיל המשתמש', icon: Mail, default: 'all', feature: 'email-tracking' },
];

const PAGE_FEATURES = ALL_PAGE_FEATURES.filter(
 (f) => (!f.feature || isFeatureEnabled(f.feature)) && (!f.module || ACTIVE_MODULE_IDS.includes(f.module))
);

const ACCESS_STATES = [
 { value: 'all', label: 'פתוח לכולם' },
 { value: 'admin', label: 'אדמין בלבד' },
 { value: 'closed', label: 'סגור לכולם' },
];

const ALERT_MODES = [
 { value: 'all', label: 'פעיל לכל המשתמשים' },
 { value: 'admins_only', label: 'אדמין בלבד' },
 { value: 'off', label: 'כבוי לכולם' },
];

export default function GlobalSystemFeaturesPanel() {
 const queryClient = useQueryClient();

 const { data: res, isLoading } = useQuery({
  queryKey: ['global-system-features'],
  queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: 'global_system_features' }),
  retry: 2,
  meta: { silent: true },
 });

 const visibility = res?.data?.value || {};

 const toggleMutation = useMutation({
  mutationFn: ({ tabId, enabled }) => api.functions.invoke('globalTabVisibility', { action: 'set', settingKey: 'global_system_features', tabId, enabled }),
  // A switch that changes what a whole organisation can reach must say so.
  // Silence here reads as "it did not save", and the setting gets toggled twice.
  onSuccess: (_r, { label, enabled }) => {
   queryClient.invalidateQueries({ queryKey: ['global-system-features'] });
   const state = ACCESS_STATES.find(s => s.value === enabled)?.label || enabled;
   toast.success(`${label || 'היכולת'} — ${state}`);
  },
  onError: (e) => toast.error(e?.message || 'שינוי ההרשאה נכשל'),
 });

 // Project alerts mode
 const { data: alertsRes, isLoading: alertsLoading } = useQuery({
  queryKey: ['project-alerts-mode'],
  queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: 'project_alerts_mode' }),
  retry: 2,
  meta: { silent: true },
 });

 const currentAlertsMode = alertsRes?.data?.value?.project_alerts_mode || 'all';

 const alertsModeMutation = useMutation({
  mutationFn: (mode) => api.functions.invoke('globalTabVisibility', { action: 'set', settingKey: 'project_alerts_mode', tabId: 'project_alerts_mode', enabled: mode }),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['project-alerts-mode'] });
   toast.success('מצב ההתראות עודכן');
  },
  onError: (e) => toast.error(e?.message || 'עדכון מצב ההתראות נכשל'),
 });

 if (isLoading) {
  return (
   <div className="flex items-center justify-center py-8">
    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin"/>
   </div>
  );
 }

 return (
  <div className="space-y-5"dir="rtl">
   {/* Nothing that was left out of the build is mentioned here at all. */}
   {PAGE_FEATURES.length > 0 && (
   <div className="bg-card rounded-xl border border-border shadow-sm p-5">
    <div className="flex items-center gap-2.5 mb-4">
     <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4 text-primary"/>
     </div>
     <div>
      <h3 className="text-sm font-bold text-foreground">תכונות מערכת גלובליות</h3>
      <p className="text-[11px] text-muted-foreground">נהל אילו תכונות מערכתיות יופיעו לכל המשתמשים</p>
     </div>
    </div>

    <div className="space-y-2">
     {PAGE_FEATURES.map(feature => {
      const accessLevel = visibility[feature.id] || feature.default;
      const Icon = feature.icon;
      return (
       <div key={feature.id} className="rounded-lg bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 mb-2">
         <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
         <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{feature.label}</span>
          <p className="text-[10px] text-muted-foreground truncate">{feature.description}</p>
         </div>
        </div>
        <div className="flex gap-1 bg-background rounded-lg p-0.5">
         {ACCESS_STATES.map(state => (
          <button
           key={state.value}
           onClick={() => toggleMutation.mutate({ tabId: feature.id, enabled: state.value, label: feature.label })}
           className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${
            accessLevel === state.value
             ? 'bg-primary text-primary-foreground font-semibold'
             : 'text-muted-foreground hover:text-foreground hover:bg-muted'
           }`}
          >
           {state.label}
          </button>
         ))}
        </div>
       </div>
      );
     })}
    </div>
   </div>
   )}

   {/* Project alerts mode — 3-state */}
   <div className="bg-card rounded-xl border border-border shadow-sm p-5">
    <div className="flex items-center gap-2.5 mb-4">
     <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
      <Bell className="w-4 h-4 text-primary"/>
     </div>
     <div>
      <h3 className="text-sm font-bold text-foreground">התראות פרויקט</h3>
      <p className="text-[11px] text-muted-foreground">שלוט במי יכול ליצור ולקבל התראות פרויקט</p>
     </div>
    </div>

    {alertsLoading ? (
     <div className="flex items-center justify-center py-4">
      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin"/>
     </div>
    ) : (
     <>
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
       {ALERT_MODES.map(mode => (
        <button
         key={mode.value}
         onClick={() => alertsModeMutation.mutate(mode.value)}
         className={`flex-1 text-xs py-2 rounded-md transition-colors ${
          currentAlertsMode === mode.value
           ? 'bg-primary text-primary-foreground font-semibold'
           : 'text-muted-foreground hover:text-foreground hover:bg-muted'
         }`}
        >
         {mode.label}
        </button>
       ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
       {currentAlertsMode === 'all' && 'כל המשתמשים עם גישה לפרויקט יכולים ליצור ולקבל התראות.'}
       {currentAlertsMode === 'admins_only' && 'רק אדמינים יכולים ליצור ולקבל התראות.'}
       {currentAlertsMode === 'off' && 'התראות פרויקט כבויות לכולם.'}
      </p>
     </>
    )}
   </div>
  </div>
 );
}
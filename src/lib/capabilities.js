import { MODULES, WORKSPACES } from '@/lib/modules';
import { ACTIVE_WORKSPACES, STANDALONE_MODULE_IDS, ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { isFeatureEnabled } from '@/lib/features';
import { isSectionEnabled } from '@/lib/settingsSections';
import { APP_IDENTITY } from '@/lib/appIdentity';

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY CATALOGUE
//
// Every switchable surface in the system, in one derived list. It is built from
// the same manifest as navigation and export, so a capability can never be
// missing from the switchboard, and a switch can never point at something that
// was left out of this build.
//
// Access levels reuse the system's existing three states:
//   'all' (default) · 'admin' · 'closed'
// ─────────────────────────────────────────────────────────────────────────────

export const SETTINGS_KEY = 'global_system_features';

export const ACCESS_LEVELS = [
  { value: 'all', label: 'פתוח' },
  { value: 'admin', label: 'אדמין' },
  { value: 'closed', label: 'סגור' },
];

const agentLabel = APP_IDENTITY.name ? `${APP_IDENTITY.name} Agent` : 'עוזר חכם';

// Feature surfaces that are not modules. `feature` names the compile-time flag
// they need; a surface whose flag is off is not listed at all.
const FEATURE_SURFACES = [
  { key: 'blossom_agent', label: agentLabel, hint: 'כפתור העוזר בסרגל וחלון הצ׳אט', feature: 'agent', requiresServer: true },
  { key: 'project_agent', label: 'עוזר חכם בפרויקט', hint: 'לשונית הסקירה של פרויקט', feature: 'agent', module: 'projects', requiresServer: true },
  { key: 'reports_agent', label: 'עוזר חכם בדוחות', hint: 'שאילתות מעל נתוני הדוחות', feature: 'agent', module: 'reports', requiresServer: true },
  { key: 'email_tracking', label: 'מעקב מיילים', hint: 'תיבת היוצא בפרופיל', feature: 'email-tracking', requiresServer: true },
  { key: 'global_search', label: 'חיפוש גלובלי', hint: 'תיבת החיפוש בסרגל העליון' },
  { key: 'notifications', label: 'מרכז התראות', hint: 'הפעמון בסרגל העליון' },
  { key: 'announcements', label: 'הכרזות ופופאפים', hint: 'חלונות הודעה למשתמשים' },
];

const SETTINGS_SURFACES = [
  { key: 'users', label: 'משתמשים והרשאות' },
  { key: 'system-features', label: 'תכונות מערכת' },
  { key: 'custom-fields', label: 'שדות מותאמים' },
  { key: 'integrations', label: 'אינטגרציות' },
  { key: 'supabase', label: 'חיבור Supabase' },
  { key: 'project-tabs', label: 'תתי-עמודים בפרויקטים' },
  { key: 'popups', label: 'פופאפים והכרזות' },
  { key: 'notifications', label: 'מרכז התראות' },
  { key: 'branding', label: 'מיתוג' },
];

/** The full catalogue, grouped for display. Only what this build contains. */
export function buildCapabilityCatalogue() {
  const groups = [];

  const standalone = STANDALONE_MODULE_IDS.filter((id) => MODULES[id].label);
  if (standalone.length) {
    groups.push({
      id: 'pages',
      label: 'עמודים ראשיים',
      items: standalone.map((id) => ({
        key: `module:${id}`,
        label: MODULES[id].label,
        hint: MODULES[id].navPath,
      })),
    });
  }

  for (const workspace of ACTIVE_WORKSPACES) {
    groups.push({
      id: `ws:${workspace.id}`,
      label: WORKSPACES[workspace.id].label,
      // Switching off a workspace hides it and everything under it.
      parent: { key: `workspace:${workspace.id}`, label: `כל ${WORKSPACES[workspace.id].label}` },
      items: workspace.children.map((id) => ({
        key: `module:${id}`,
        label: MODULES[id].label,
        hint: MODULES[id].navPath,
      })),
    });
  }

  const features = FEATURE_SURFACES.filter(
    (f) => (!f.feature || isFeatureEnabled(f.feature)) && (!f.module || ACTIVE_MODULE_IDS.includes(f.module))
  );
  if (features.length) {
    groups.push({ id: 'features', label: 'יכולות מערכת', items: features });
  }

  const sections = SETTINGS_SURFACES.filter((s) => isSectionEnabled(s.key));
  if (sections.length) {
    groups.push({
      id: 'settings',
      label: 'מקטעי הגדרות',
      items: sections.map((s) => ({ key: `section:${s.key}`, label: s.label })),
    });
  }

  return groups;
}

/** Surfaces that cannot work without a backend, from the same declaration. */
export const SERVER_BACKED_KEYS = new Set(
  FEATURE_SURFACES.filter((f) => f.requiresServer).map((f) => f.key)
);

export const requiresServer = (key) => SERVER_BACKED_KEYS.has(key);

export const accessOf = (values, key) => values?.[key] || 'all';

/** Resolve one capability for one viewer. */
export function isCapabilityVisible(values, key, isAdmin) {
  const level = accessOf(values, key);
  if (level === 'closed') return false;
  if (level === 'admin') return !!isAdmin;
  return true;
}

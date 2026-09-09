// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS CATALOG — the one list of settings sections.
//
// A section used to have to be registered in five places: the panel resolver,
// the settings page's tab list, the export dialog's checkbox list, the export
// planner's file map, and the generated enabled-sections file. Four of them
// could be forgotten independently, and each omission failed differently — a
// tab with no panel, a panel with no tab, a section that exported without its
// file.
//
// Everything now derives from this array. Adding a section is one entry here.
//
// Kept deliberately plain: no JSX, no `@/` alias, no imports at all, because
// tools/export-core.js reads it from Node where neither of those resolve.
// ─────────────────────────────────────────────────────────────────────────────

export const SETTINGS_CATALOG = [
  {
    id: 'users',
    label: 'משתמשים והרשאות',
    icon: 'Users',
    panel: 'UserManagementPanel',
    // Rendered by the settings page itself rather than through the admin
    // panel resolver — it is a top-level tab, not an admin sub-section.
    topLevel: true,
    hint: 'מי נכנס למערכת, באיזה תפקיד ומה מותר לו לראות',
  },
  { id: 'capabilities', label: 'יכולות המערכת', icon: 'ToggleLeft', panel: 'CapabilitiesPanel', hint: 'הדלקה וכיבוי של יכולות לכל המשתמשים' },
  { id: 'system-features', label: 'תכונות מערכת', icon: 'SlidersHorizontal', panel: 'GlobalSystemFeaturesPanel', hint: 'תכונות רוחביות: חיפוש, התראות, עוזר חכם' },
  { id: 'custom-fields', label: 'שדות מותאמים', icon: 'ListPlus', panel: 'CustomFieldsPanel', hint: 'הוספת שדות משלכם לכל מודול, כולל הצגה מותנית' },
  { id: 'integrations', label: 'אינטגרציות', icon: 'Plug', panel: 'IntegrationsPanel', hint: 'מייל, יומן וסנכרון משתמשים' },
  { id: 'supabase', label: 'חיבור Supabase', icon: 'Database', panel: 'SupabasePanel', hint: 'מעבר משמירה מקומית לשרת אמיתי' },
  { id: 'project-tabs', label: 'תתי-עמודים בפרויקטים', icon: 'Route', panel: 'GlobalTabVisibilityPanel', hint: 'אילו לשוניות מופיעות בתוך פרויקט' },
  { id: 'popups', label: 'פופאפים והכרזות', icon: 'Bell', panel: 'PopupManagementPanel', hint: 'הודעות שקופצות למשתמשים בכניסה' },
  { id: 'notifications', label: 'מרכז התראות', icon: 'Bell', panel: 'NotificationsCenterPanel', hint: 'אילו התראות נשלחות, למי ומתי' },
  { id: 'branding', label: 'מיתוג ולוגו', icon: 'Palette', panel: 'BrandingPanel', hint: 'לוגו, צבע מותג, שם המערכת ופרטי חברה למסמכים' },
  { id: 'audit', label: 'יומן פעולות', icon: 'ScrollText', panel: 'AuditLogPanel', hint: 'מי שינה מה במערכת ומתי' },
];

export const SETTINGS_SECTION_IDS = SETTINGS_CATALOG.map((s) => s.id);

export const settingsSection = (id) => SETTINGS_CATALOG.find((s) => s.id === id) || null;

/** The admin sub-sections — everything that is not a tab of its own. */
export const ADMIN_SECTIONS = SETTINGS_CATALOG.filter((s) => !s.topLevel);

/** Where each section's panel lives, for the export planner. */
export const SETTINGS_PANEL_PATHS = Object.fromEntries(
  SETTINGS_CATALOG.map((s) => [s.id, `src/components/settings/${s.panel}.jsx`]),
);

// ─────────────────────────────────────────────────────────────────────────────
// MODULE MANIFEST — the single source of truth for the whole system.
//
// Routes (src/App.jsx), the sidebar (src/lib/navItems.js) and the ZIP export
// (vite.config.js) are ALL derived from this file. Nothing is duplicated,
// nothing is generated as a string. Adding a module = adding one entry here.
//
// Fields
//   label     – Hebrew label (shown as a workspace tab, or in the sidebar when
//               the module has no parent)
//   icon      – key into NAV_ICONS
//   group     – sidebar placement for parentless modules: 'core' | 'system'
//   parent    – workspace id from WORKSPACES. The sidebar shows the WORKSPACE,
//               not the module, and the module becomes a tab inside it.
//   navPath   – which of the module's routes the tab/sidebar links to
//   routes    – [{ path, page }] where `page` is a file in src/pages/<page>.jsx
//
// Navigation and modularity are deliberately separate concerns: a module is a
// unit of code and export, a workspace is a unit of user intent. One module can
// be exported alone and still know which workspace it belongs to; a workspace
// with no modules in the build simply does not render.
// ─────────────────────────────────────────────────────────────────────────────

export const WORKSPACES = {
  sales: { label: 'מכירות', icon: 'leads', group: 'core' },
  delivery: { label: 'פרויקטים', icon: 'projects', group: 'core' },
  finance: { label: 'כספים', icon: 'invoices', group: 'core' },
  people: { label: 'כוח אדם', icon: 'employees', group: 'core' },
  supply: { label: 'רכש ומלאי', icon: 'inventory', group: 'core' },
  governance: { label: 'ממשל וסיכונים', icon: 'compliance', group: 'operations' },
  operations: { label: 'תפעול', icon: 'reports', group: 'operations' },
};

export const WORKSPACE_IDS = Object.keys(WORKSPACES);

export const MODULES = {
  dashboard: {
    label: 'דף הבית', icon: 'dashboard', group: 'core', navPath: '/',
    routes: [{ path: '/', page: 'Dashboard' }],
  },
  projects: {
    label: 'פרויקטים', icon: 'projects', parent: 'delivery', navPath: '/projects',
    routes: [
      { path: '/projects', page: 'Projects' },
      { path: '/projects/new', page: 'NewProject' },
      { path: '/projects/:slug', page: 'ProjectDetail' },
      { path: '/projects/:slug/edit', page: 'EditProject' },
    ],
  },
  proposals: {
    label: 'הצעות מחיר', icon: 'proposals', parent: 'finance', navPath: '/proposals',
    routes: [{ path: '/proposals', page: 'Proposals' }],
  },
  notes: {
    label: 'פתקים', icon: 'notes', parent: 'delivery', navPath: '/notes',
    routes: [{ path: '/notes', page: 'Notes' }],
  },
  calendar: {
    label: 'יומן', icon: 'calendar', parent: 'delivery', navPath: '/calendar',
    routes: [{ path: '/calendar', page: 'Calendar' }],
  },
  tasks: {
    label: 'משימות', icon: 'tasks', parent: 'delivery', navPath: '/tasks',
    routes: [{ path: '/tasks', page: 'Tasks' }],
  },
  leads: {
    label: 'לידים', icon: 'leads', parent: 'sales', navPath: '/leads',
    routes: [{ path: '/leads', page: 'Leads' }],
  },
  contacts: {
    label: 'אנשי קשר', icon: 'contacts', parent: 'sales', navPath: '/contacts',
    routes: [{ path: '/contacts', page: 'Contacts' }],
  },
  forecast: {
    label: 'תחזית', icon: 'forecast', parent: 'sales', navPath: '/forecast',
    routes: [{ path: '/forecast', page: 'Forecast' }],
  },
  invoices: {
    label: 'חשבוניות', icon: 'invoices', parent: 'finance', navPath: '/invoices',
    routes: [{ path: '/invoices', page: 'Invoices' }],
  },
  products: {
    label: 'מוצרים', icon: 'products', parent: 'finance', navPath: '/products',
    routes: [{ path: '/products', page: 'Products' }],
  },
  automations: {
    label: 'אוטומציות', icon: 'automations', parent: 'operations', navPath: '/automations',
    routes: [{ path: '/automations', page: 'Automations' }],
  },
  employees: {
    label: 'עובדים', icon: 'employees', parent: 'people', navPath: '/employees',
    routes: [{ path: '/employees', page: 'Employees' }],
  },
  recruiting: {
    label: 'גיוס', icon: 'recruiting', parent: 'people', navPath: '/recruiting',
    routes: [{ path: '/recruiting', page: 'Recruiting' }],
  },
  training: {
    label: 'הכשרות', icon: 'training', parent: 'people', navPath: '/training',
    routes: [{ path: '/training', page: 'Training' }],
  },
  inventory: {
    label: 'מלאי', icon: 'inventory', parent: 'supply', navPath: '/inventory',
    routes: [{ path: '/inventory', page: 'Inventory' }],
  },
  purchasing: {
    label: 'רכש', icon: 'purchasing', parent: 'supply', navPath: '/purchasing',
    routes: [{ path: '/purchasing', page: 'Purchasing' }],
  },
  assets: {
    label: 'נכסים וציוד', icon: 'assets', parent: 'supply', navPath: '/assets',
    routes: [{ path: '/assets', page: 'Assets' }],
  },
  maintenance: {
    label: 'תחזוקה', icon: 'maintenance', parent: 'supply', navPath: '/maintenance',
    routes: [{ path: '/maintenance', page: 'Maintenance' }],
  },
  compliance: {
    label: 'תאימות', icon: 'compliance', parent: 'governance', navPath: '/compliance',
    routes: [{ path: '/compliance', page: 'Compliance' }],
  },
  risks: {
    label: 'סיכונים', icon: 'risks', parent: 'governance', navPath: '/risks',
    routes: [{ path: '/risks', page: 'Risks' }],
  },
  subscriptions: {
    label: 'מנויים', icon: 'subscriptions', parent: 'finance', navPath: '/subscriptions',
    routes: [{ path: '/subscriptions', page: 'Subscriptions' }],
  },
  reports: {
    label: 'דוחות', icon: 'reports', parent: 'operations', navPath: '/reports',
    routes: [{ path: '/reports', page: 'Reports' }],
  },
  support: {
    label: 'תמיכה', icon: 'support', parent: 'operations', navPath: '/support',
    routes: [{ path: '/support', page: 'Support' }],
  },
  settings: {
    label: 'הגדרות', icon: 'settings', group: 'system', navPath: '/settings',
    routes: [{ path: '/settings', page: 'Settings' }],
  },
};

// Always shipped, never selectable — the app cannot boot without them.
export const CORE_ROUTES = [
  { path: '/profile', page: 'Profile' },
  { path: '/notifications', page: 'Notifications' },
];

// Pages that are shipped but mounted outside the route table.
export const CORE_PAGES = ['FirstTimeSetup'];

export const MODULE_IDS = Object.keys(MODULES);

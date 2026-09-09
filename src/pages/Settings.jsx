import React, { useState, lazy, Suspense } from 'react';
import { Users, Plug, SlidersHorizontal, ShieldCheck, Route, Bell, Download, Palette, ListPlus, ToggleLeft, Database, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useSearchParams } from 'react-router-dom';
import UserManagementPanel from '@/components/settings/UserManagementPanel';
import AdminPanel, { AVAILABLE_ADMIN_SECTIONS } from '@/components/settings/AdminPanel';
import { isSectionEnabled } from '@/lib/settingsSections';
import { SETTINGS_CATALOG, ADMIN_SECTIONS } from '@/lib/settingsCatalog';

import PageHeader from '@/components/shared/PageHeader';
import { NAV_ICONS } from '@/lib/navIcons';
import SectionStepperNav from '@/components/shared/SectionStepperNav';
// The export runs entirely in the browser (src/lib/browserExport.js), so the
// button works in the deployed app too — not just on the dev server. It is
// resolved through a glob so that a bundle exported with dev tools switched off
// simply has no dialog and no button, with nothing stripped from this file.
const exportLoaders = import.meta.glob('/src/components/settings/ExportDialog.jsx');
const exportLoader = exportLoaders['/src/components/settings/ExportDialog.jsx'];
const EXPORT_ENABLED = Boolean(exportLoader);
const ExportDialog = EXPORT_ENABLED ? lazy(exportLoader) : null;

// Tabs are filtered by what is actually compiled into this build — see
// src/lib/settingsSections.js. Nothing is stripped from this file at export time.
// Icons are named in the catalog and resolved here, so the catalog stays free
// of imports and can be read by the export planner from Node.
const SETTINGS_ICONS = {
  Users, Plug, SlidersHorizontal, Route, Bell, Palette, ListPlus, ToggleLeft, Database, ScrollText,
};

const ADMIN_CHILDREN = ADMIN_SECTIONS
  .map((s) => ({ key: s.id, label: s.label, hint: s.hint, icon: SETTINGS_ICONS[s.icon] }))
  .filter((c) => AVAILABLE_ADMIN_SECTIONS.includes(c.key));

const TOP_LEVEL = SETTINGS_CATALOG.filter((s) => s.topLevel);

const ALL_TABS = [
  { key: 'admin', label: 'אדמין', icon: ShieldCheck, adminOnly: true, hasChildren: true },
  ...TOP_LEVEL.map((s) => ({ key: s.id, label: s.label, hint: s.hint, icon: SETTINGS_ICONS[s.icon], adminOnly: true })),
].filter((t) => (t.key === 'admin' ? ADMIN_CHILDREN.length > 0 : isSectionEnabled(t.key)));

export default function Settings() {
  const { isRealAdmin } = useAccessControl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [adminSub, setAdminSub] = useState(ADMIN_CHILDREN[0]?.key || 'system-features');
  const [exportOpen, setExportOpen] = useState(false);
  
  const visibleTabs = ALL_TABS.filter(t => isRealAdmin || t.allUsers);
  const tabParam = searchParams.get('tab');
  const validTab = visibleTabs.some(t => t.key === tabParam);
  const [active, setActive] = useState(validTab ? tabParam : visibleTabs[0]?.key);

  const selectTab = (key) => {
    setActive(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  const sections = visibleTabs.map(t =>
    t.key === 'admin' ? { ...t, children: ADMIN_CHILDREN } : t
  );

  return (
    <div>
      <PageHeader
        icon={NAV_ICONS.settings}
        title="הגדרות"
        subtitle="ניהול המערכת, ההעדפות ומעקב הפעולות"
        actions={
          EXPORT_ENABLED ? (
            <Button
              onClick={() => setExportOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-10 text-sm font-semibold gap-2"
            >
              <Download className="w-4 h-4" /> ייצוא (ZIP)
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 lg:flex-shrink-0">
          <div className="sticky top-20">
            <SectionStepperNav
              title="הגדרות"
              searchable
              searchPlaceholder="חיפוש הגדרה..."
              sections={sections}
              activeKey={active}
              activeChildKey={active === 'admin' ? adminSub : undefined}
              onSelect={selectTab}
              onSelectChild={setAdminSub}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {active === 'users' && <UserManagementPanel />}

          {active === 'admin' && <AdminPanel activeSub={adminSub} />}
        </div>
      </div>

      {EXPORT_ENABLED && exportOpen && (
        <Suspense fallback={null}>
          <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
        </Suspense>
      )}
    </div>
  );
}

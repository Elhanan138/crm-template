import React, { lazy, Suspense } from 'react';
import { isSectionEnabled } from '@/lib/settingsSections';

// Lazily resolved against the files present in the build. A section that was
// dropped from the export simply has no loader — no dangling import, no crash.
const panelLoaders = import.meta.glob('/src/components/settings/*Panel.jsx');

const PANELS = {
  'system-features': 'GlobalSystemFeaturesPanel',
  'capabilities': 'CapabilitiesPanel',
  'custom-fields': 'CustomFieldsPanel',
  'integrations': 'IntegrationsPanel',
  'supabase': 'SupabasePanel',
  'project-tabs': 'GlobalTabVisibilityPanel',
  'popups': 'PopupManagementPanel',
  'notifications': 'NotificationsCenterPanel',
  'branding': 'BrandingPanel',
};

const resolved = Object.fromEntries(
  Object.entries(PANELS)
    .filter(([id, name]) => isSectionEnabled(id) && panelLoaders[`/src/components/settings/${name}.jsx`])
    .map(([id, name]) => [id, lazy(panelLoaders[`/src/components/settings/${name}.jsx`])])
);

export const AVAILABLE_ADMIN_SECTIONS = Object.keys(resolved);

export default function AdminPanel({ activeSub = 'system-features' }) {
  const Panel = resolved[activeSub] || resolved[AVAILABLE_ADMIN_SECTIONS[0]];
  return (
    <div className="space-y-5">
      <Suspense fallback={null}>{Panel ? <Panel /> : null}</Suspense>
    </div>
  );
}

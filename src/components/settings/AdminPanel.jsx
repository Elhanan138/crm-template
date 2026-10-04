import React, { lazy, Suspense } from 'react';
import { isSectionEnabled } from '@/lib/settingsSections';
import { ADMIN_SECTIONS } from '@/lib/settingsCatalog';

// Lazily resolved against the files present in the build. A section that was
// dropped from the export simply has no loader — no dangling import, no crash.
const panelLoaders = import.meta.glob('/src/components/settings/*Panel.jsx');

// One entry per admin sub-section, taken straight from the catalog.
const PANELS = Object.fromEntries(ADMIN_SECTIONS.map((s) => [s.id, s.panel]));

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

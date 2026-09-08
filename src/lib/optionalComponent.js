import { lazy } from 'react';
import { isFeatureEnabled } from '@/lib/features';

// Optional surfaces are resolved through a build-time glob instead of a static
// import. A bundle exported without the feature simply has no file, so the
// mount point renders nothing — no dangling import, no code stripped from
// the host component.
const optionalModules = {
  ...import.meta.glob('/src/components/shared/*.jsx'),
  ...import.meta.glob('/src/components/project/ProjectA*.jsx'),
  ...import.meta.glob('/src/components/development/ReportsAIChat.jsx'),
  ...import.meta.glob('/src/components/profile/*.jsx'),
  ...import.meta.glob('/src/components/settings/*.jsx'),
};

/**
 * @param {string} feature  feature id from src/lib/features.js
 * @param {string} path     repo path, e.g. 'src/components/shared/SystemAssistantSheet.jsx'
 * @returns {React.LazyExoticComponent|null}
 */
export function optionalComponent(feature, path) {
  if (feature && !isFeatureEnabled(feature)) return null;
  const loader = optionalModules[`/${path}`];
  return loader ? lazy(loader) : null;
}

export const hasOptional = (feature, path) =>
  (!feature || isFeatureEnabled(feature)) && Boolean(optionalModules[`/${path}`]);

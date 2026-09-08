import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { isFeatureEnabled } from '@/lib/features';
import { SETTINGS_KEY, isCapabilityVisible, requiresServer } from '@/lib/capabilities';
import { useServerRuntime } from '@/lib/runtimeCapabilities';

/**
 * Is one capability visible to the current viewer?
 *
 * Three gates, all of which must pass:
 *   1. compile time — was it included in this build at all (`buildFlag`)
 *   2. deployment   — does this surface need a server, and is there one
 *   3. run time     — has an administrator closed it in הגדרות → יכולות המערכת
 *
 * The middle gate is what stops a button from being offered when pressing it
 * could only ever answer "requires a server". Which surfaces need one is
 * declared once, beside the surface itself, in src/lib/capabilities.js.
 */
export function useCapability(key, buildFlag) {
  const { isRealAdmin } = useAccessControl();
  const compiledIn = buildFlag ? isFeatureEnabled(buildFlag) : true;
  const needsServer = requiresServer(key);
  const { hasServer, isLoading: serverLoading } = useServerRuntime();

  const { data } = useQuery({
    queryKey: ['global-system-features'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: SETTINGS_KEY }),
    staleTime: 30000,
    enabled: compiledIn,
  });

  if (!compiledIn) return false;
  // Never flash a server-backed surface into view and then remove it: while the
  // answer is unknown, it is not shown.
  if (needsServer && (serverLoading || !hasServer)) return false;
  return isCapabilityVisible(data?.data?.value, key, isRealAdmin);
}

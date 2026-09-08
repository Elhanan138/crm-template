import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { isFeatureEnabled } from '@/lib/features';
import { SETTINGS_KEY, isCapabilityVisible } from '@/lib/capabilities';

/**
 * Is one capability visible to the current viewer?
 *
 * Two gates, both must pass:
 *   1. compile time — was it included in this build at all (`buildFlag`)
 *   2. run time     — has an administrator closed it in הגדרות → יכולות המערכת
 */
export function useCapability(key, buildFlag) {
  const { isRealAdmin } = useAccessControl();
  const compiledIn = buildFlag ? isFeatureEnabled(buildFlag) : true;

  const { data } = useQuery({
    queryKey: ['global-system-features'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: SETTINGS_KEY }),
    staleTime: 30000,
    enabled: compiledIn,
  });

  if (!compiledIn) return false;
  return isCapabilityVisible(data?.data?.value, key, isRealAdmin);
}

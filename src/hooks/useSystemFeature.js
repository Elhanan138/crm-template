import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { isFeatureEnabled } from '@/lib/features';

/**
 * Runtime visibility of a system feature, on top of the compile-time flag.
 * Returns false when the feature was not built in, or when an administrator
 * has closed it for this user. States: 'all' | 'admin' | 'closed'.
 */
export function useSystemFeature(featureId, buildFlag) {
  const { isRealAdmin } = useAccessControl();
  const compiledIn = buildFlag ? isFeatureEnabled(buildFlag) : true;

  const { data } = useQuery({
    queryKey: ['global-system-features'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: 'global_system_features' }),
    staleTime: 60000,
    enabled: compiledIn,
  });

  if (!compiledIn) return false;
  const access = data?.data?.value?.[featureId] || 'all';
  return access === 'all' || (access === 'admin' && isRealAdmin);
}

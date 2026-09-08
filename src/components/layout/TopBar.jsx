import React from 'react';
import GlobalSearch from './GlobalSearch';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import { Bot } from 'lucide-react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { isFeatureEnabled } from '@/lib/features';
import { useCapability } from '@/hooks/useCapability';
import { APP_IDENTITY } from '@/lib/appIdentity';

const AGENT_LABEL = APP_IDENTITY.name ? `${APP_IDENTITY.name} Agent` : 'עוזר חכם';

export default function TopBar({ collapsed, onToggle }) {
  const searchEnabled = useCapability('global_search');
  const notificationsEnabled = useCapability('notifications');
  const { effectiveUser, isRealAdmin } = useAccessControl();
  const { data: sysFeaturesRes } = useQuery({
    queryKey: ['global-system-features'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: 'global_system_features' }),
    staleTime: 60000,
  });
  const blossomAgentAccess = sysFeaturesRes?.data?.value?.blossom_agent || 'all';
  const blossomAgentEnabled =
    isFeatureEnabled('agent') &&
    (blossomAgentAccess === 'all' || (blossomAgentAccess === 'admin' && isRealAdmin));

  return (
    <div
      className="hidden md:flex sticky top-0 z-30 items-center gap-3 h-16 px-6 bg-background/80 backdrop-blur-md border-b border-border"
      dir="rtl"
    >
      {/* Global search — centered input (start side in RTL) */}
      <div className="order-1 flex-1 flex justify-center">
        {searchEnabled && <GlobalSearch />}
      </div>

      {/* Account cluster — agent → bell → profile (end side = left in RTL) */}
      <div className="order-2 flex items-center gap-1.5">
        {blossomAgentEnabled && (
        <button
        onClick={() => window.dispatchEvent(new CustomEvent('system-assistant-open'))}
        className="ai-glow w-10 h-10 rounded-full flex items-center justify-center bg-primary hover:bg-primary/90 transition-colors text-primary-foreground flex-shrink-0"
        title={AGENT_LABEL}
        aria-label={AGENT_LABEL}
        >
        <Bot className="w-5 h-5" />
        </button>
        )}
        {notificationsEnabled && <NotificationBell userEmail={effectiveUser?.email} />}
        <UserMenu />
      </div>
    </div>
  );
}
import React from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plug, Loader2, RefreshCw } from 'lucide-react';
import OutlookCalendarSection from '@/components/settings/OutlookCalendarSection';
import GmailSection from '@/components/settings/GmailSection';
import AlertHeartbeatSection from '@/components/settings/AlertHeartbeatSection';
import UserConnectionsPanel from '@/components/settings/UserConnectionsPanel';
import ServerStatusCard from '@/components/settings/ServerStatusCard';
import { useServerRuntime } from '@/lib/runtimeCapabilities';
import { useI18n } from '@/lib/i18n';

export default function IntegrationsPanel() {
  const { t } = useI18n();
 const { hasServer } = useServerRuntime();
 const { data: status = {}, refetch, isRefetching } = useQuery({
  queryKey: ['integrations-status'],
  queryFn: async () => {
   const res = await api.functions.invoke('checkIntegrations', {});
   return res.data || {};
  },
  retry: false,
  enabled: hasServer,
 });

 return (
  <div>
   <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
    <div className="flex items-center gap-3">
     <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
      <Plug className="w-5 h-5 text-primary"/>
     </div>
     <div>
      <h2 className="text-base font-bold text-foreground">{t("אינטגרציות")}</h2>
      <p className="text-caption">{t("חיבור המערכת לשירותים חיצוניים")}</p>
     </div>
    </div>
    {hasServer && (
     <Button variant="outline"size="sm"onClick={() => refetch()} disabled={isRefetching} className="rounded-full h-9 px-4 text-xs gap-1.5">
      {isRefetching ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <RefreshCw className="w-3.5 h-3.5"/>} רענן סטטוס
     </Button>
    )}
   </div>

   <div className="space-y-4">
    <ServerStatusCard />
    {/* Every service below needs a backend. Without one they are not shown at
        all — a "connect" button that cannot connect is worse than its absence. */}
    {hasServer && (
     <>
      <GmailSection status={status.gmail} />
      <AlertHeartbeatSection />
      <OutlookCalendarSection />
      <UserConnectionsPanel />
     </>
    )}
   </div>
  </div>
 );
}
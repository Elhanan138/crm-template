import React from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plug, Loader2, RefreshCw } from 'lucide-react';
import OutlookCalendarSection from '@/components/settings/OutlookCalendarSection';
import GmailSection from '@/components/settings/GmailSection';
import AlertHeartbeatSection from '@/components/settings/AlertHeartbeatSection';
import UserConnectionsPanel from '@/components/settings/UserConnectionsPanel';

export default function IntegrationsPanel() {
 const { data: status = {}, isLoading, refetch, isRefetching } = useQuery({
  queryKey: ['integrations-status'],
  queryFn: async () => {
   const res = await api.functions.invoke('checkIntegrations', {});
   return res.data || {};
  },
  retry: false,
 });

 return (
  <div>
   <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
    <div className="flex items-center gap-3">
     <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
      <Plug className="w-5 h-5 text-primary"/>
     </div>
     <div>
      <h2 className="text-base font-bold text-foreground">אינטגרציות</h2>
      <p className="text-caption">חיבור המערכת לשירותים חיצוניים</p>
     </div>
    </div>
    <Button variant="outline"size="sm"onClick={() => refetch()} disabled={isRefetching} className="rounded-full h-9 px-4 text-xs gap-1.5">
     {isRefetching ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <RefreshCw className="w-3.5 h-3.5"/>} רענן סטטוס
    </Button>
   </div>

   <div className="space-y-4">
    <GmailSection status={status.gmail} />
    <AlertHeartbeatSection />
    <OutlookCalendarSection />
    <UserConnectionsPanel />
   </div>
  </div>
 );
}
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Lock, Loader2 } from 'lucide-react';
import { PROJECT_TABS } from '@/components/project/projectTabs';

export default function GlobalTabVisibilityPanel() {
 const queryClient = useQueryClient();

 const { data: res, isLoading } = useQuery({
  queryKey: ['global-tab-visibility'],
  queryFn: () => api.functions.invoke('globalTabVisibility', {}),
 });

 const visibility = res?.data?.value || {};

 const toggleMutation = useMutation({
  mutationFn: ({ tabId, enabled }) => api.functions.invoke('globalTabVisibility', { action: 'set', tabId, enabled }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['global-tab-visibility'] }),
 });

 if (isLoading) {
  return (
   <div className="flex items-center justify-center py-8">
    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin"/>
   </div>
  );
 }

 const visibleTabs = PROJECT_TABS.filter(t => !t.hidden);

 return (
  <div className="bg-card rounded-xl border border-border shadow-sm p-5"dir="rtl">
   <div className="flex items-center gap-2.5 mb-4">
    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
     <Eye className="w-4 h-4 text-primary"/>
    </div>
    <div>
     <h3 className="text-sm font-bold text-foreground">תתי-עמודים גלובליים</h3>
     <p className="text-[11px] text-muted-foreground">נהל אילו טאבים יופיעו בכל הפרויקטים — הסתרה אינה מוחקת נתונים</p>
    </div>
   </div>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
    {visibleTabs.map(tab => {
     const isVisible = tab.id === 'overview' ? true : visibility[tab.id] !== false;
     const isOverview = tab.id === 'overview';
     const Icon = tab.icon;
     return (
      <div key={tab.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
       <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
        <span className="text-sm font-medium text-foreground truncate">{tab.label}</span>
       </div>
       {isOverview ? (
        <TooltipProvider>
         <Tooltip>
          <TooltipTrigger asChild>
           <div className="flex items-center gap-1.5 cursor-help">
            <Lock className="w-3 h-3 text-muted-foreground"/>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">תמיד מוצג</span>
           </div>
          </TooltipTrigger>
          <TooltipContent dir="rtl">
           <p>טאב הסקירה אינו ניתן להסתרה</p>
          </TooltipContent>
         </Tooltip>
        </TooltipProvider>
       ) : (
        <Switch
         checked={isVisible}
         onCheckedChange={(checked) => toggleMutation.mutate({ tabId: tab.id, enabled: checked })}
        />
       )}
      </div>
     );
    })}
   </div>
  </div>
 );
}
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlayCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import CrmModulePage from '@/components/crm/CrmModulePage';
import AutomationBuilder from '@/components/crm/AutomationBuilder';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

export default function Automations() {
  const queryClient = useQueryClient();

  // The rules also run on the app's heartbeat. This button exists because a
  // rule you cannot try is a rule you cannot trust — it reports exactly how
  // many records each rule matched.
  const run = useMutation({
    mutationFn: async () => {
      const { data } = await api.functions.invoke('runAutomations', {});
      if (data?.success === false) throw new Error(data.error || 'ההרצה נכשלה');
      return data;
    },
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      toast.success(
        summary?.matched
          ? `${summary.rules} כללים רצו · ${summary.matched} רשומות תואמות · ${summary.actions} פעולות בוצעו`
          : `${summary?.rules ?? 0} כללים רצו — אף רשומה לא תאמה כרגע`
      );
    },
    onError: (error) => toast.error(error?.message || 'הרצת האוטומציות נכשלה'),
  });

  // Rules need a trigger/condition/action builder, not a flat field form.
  return (
    <CrmModulePage
      schema={CRM_SCHEMAS.automations}
      moduleId="automations"
      EditorComponent={AutomationBuilder}
      extraActions={
        <Button
          variant="outline"
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="rounded-full h-9 px-4 text-sm gap-1.5"
        >
          {run.isPending
            ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            : <PlayCircle className="w-4 h-4 flex-shrink-0" />}
          הרץ עכשיו
        </Button>
      }
    />
  );
}

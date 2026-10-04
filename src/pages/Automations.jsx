import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlayCircle, Loader2, Library, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { api } from '@/api/client';
import CrmModulePage from '@/components/crm/CrmModulePage';
import AutomationBuilder from '@/components/crm/AutomationBuilder';
import { CRM_SCHEMAS, AUTOMATION_TEMPLATES, subjectMeta } from '@/lib/crm/schemas';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { useI18n } from '@/lib/i18n';

// Only the starting points whose module is in this build: a bundle without
// invoices is not offered a collection reminder it has nothing to run on.
const AVAILABLE_TEMPLATES = AUTOMATION_TEMPLATES.filter((tpl) => ACTIVE_MODULE_IDS.includes(tpl.module));

/**
 * The rules almost every business ends up writing, one press away. An empty
 * builder is a blank page most people never fill in.
 */
function RuleLibrary({ open, onOpenChange }) {
  const { t, dir } = useI18n();
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['crm', 'AutomationRule'],
    queryFn: () => api.entities.AutomationRule.list(),
    enabled: open,
  });
  // A template already added is marked, so pressing it twice does not create
  // two identical rules that would each create the same task.
  const added = new Set(rules.map((r) => r.template_id).filter(Boolean));

  const add = useMutation({
    mutationFn: (tpl) => {
      const { id, module: _module, ...rule } = tpl;
      // Added switched off: a rule that creates tasks is checked with the dry
      // run against real data before it is let loose on it.
      return api.entities.AutomationRule.create({ ...rule, template_id: id, active: false, run_mode: 'auto' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      toast.success(t('הכלל נוסף כבוי — פתח אותו, הרץ בדיקה יבשה והפעל'));
    },
    onError: (e) => toast.error(e?.message || t('הוספת הכלל נכשלה')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('ספריית כללים')}</DialogTitle>
          <DialogDescription>{t('כללים שכמעט כל עסק כותב בסוף — מוכנים, ונוספים כבויים.')}</DialogDescription>
        </DialogHeader>
        {AVAILABLE_TEMPLATES.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t('אין בחבילה הזו מודולים שהספרייה מכסה.')}</p>
        ) : (
          <ul className="space-y-2">
            {AVAILABLE_TEMPLATES.map((tpl) => {
              const isAdded = added.has(tpl.id);
              return (
                <li key={tpl.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-border p-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-semibold">{t(tpl.name)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(tpl.description)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{t(subjectMeta(tpl.subject)?.label)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? 'outline' : 'default'}
                    disabled={isAdded || add.isPending}
                    onClick={() => add.mutate(tpl)}
                    className="rounded-full h-8 gap-1.5 flex-shrink-0"
                  >
                    {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {isAdded ? t('נוסף') : t('הוסף')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Automations() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [libraryOpen, setLibraryOpen] = useState(false);

  // The rules also run on the app's heartbeat. This button exists because a
  // rule you cannot try is a rule you cannot trust — it reports exactly how
  // many records each rule matched.
  const run = useMutation({
    mutationFn: async () => {
      const { data } = await api.functions.invoke('runAutomations', {});
      if (data?.success === false) throw new Error(data.error || t('ההרצה נכשלה'));
      return data;
    },
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      toast.success(
        summary?.matched
          ? `${summary.rules} ${t('כללים רצו')} · ${summary.matched} ${t('רשומות תואמות')} · ${summary.actions} ${t('פעולות בוצעו')}`
          : `${summary?.rules ?? 0} ${t('כללים רצו — אף רשומה לא תאמה כרגע')}`
      );
    },
    onError: (error) => toast.error(error?.message || t('הרצת האוטומציות נכשלה')),
  });

  // Rules need a trigger/condition/action builder, not a flat field form.
  return (
    <>
      <CrmModulePage
        schema={CRM_SCHEMAS.automations}
        moduleId="automations"
        EditorComponent={AutomationBuilder}
        extraActions={
          <>
            {AVAILABLE_TEMPLATES.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setLibraryOpen(true)}
                className="rounded-full h-9 px-3.5 text-sm gap-1.5"
                title={t('ספריית כללים')}
              >
                <Library className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('ספריית כללים')}</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => run.mutate()}
              disabled={run.isPending}
              className="rounded-full h-9 px-4 text-sm gap-1.5"
            >
              {run.isPending
                ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                : <PlayCircle className="w-4 h-4 flex-shrink-0" />}
              <span className="hidden sm:inline">{t('הרץ עכשיו')}</span>
            </Button>
          </>
        }
      />
      <RuleLibrary open={libraryOpen} onOpenChange={setLibraryOpen} />
    </>
  );
}

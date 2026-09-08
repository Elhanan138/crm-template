import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionCard from '@/components/shared/SectionCard';
import { api } from '@/api/client';
import { useI18n } from '@/lib/i18n';
import { ONBOARDING_KEY } from '@/components/onboarding/OnboardingWizard';

/**
 * Run the opening wizard again.
 *
 * It clears the one flag the wizard sets, and the gate in FirstTimeSetup does
 * the rest — no second trigger, no separate route to keep in step.
 */
export default function RerunWizardCard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const rerun = useMutation({
    mutationFn: () => api.auth.updateMe({ [ONBOARDING_KEY]: null }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(t('אשף הפתיחה ייפתח מחדש'));
    },
    onError: (e) => toast.error(e?.message || t('פתיחת האשף נכשלה')),
  });

  return (
    <SectionCard title={t('אשף הפתיחה')} icon={Wand2}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-caption max-w-prose">
          {t('מיתוג, בחירת חבילת המודולים, הזמנת משתמשים ונתוני דוגמה. הרצה מחדש לא מוחקת דבר — היא רק פותחת את המסכים שוב.')}
        </p>
        <Button
          variant="outline"
          onClick={() => rerun.mutate()}
          disabled={rerun.isPending}
          className="rounded-full h-9 px-4 text-sm gap-1.5 flex-shrink-0"
        >
          {rerun.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {t('הרצה מחדש')}
        </Button>
      </div>
    </SectionCard>
  );
}

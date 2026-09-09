import React from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccessControl } from '@/hooks/useAccessControl';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAdminUser } from '@/lib/permissions';
import { toast } from 'sonner';
import OnboardingWizard, { ONBOARDING_KEY } from '@/components/onboarding/OnboardingWizard';

/**
 * FirstTimeSetup — the gate a brand-new deployment passes through.
 *
 * Two steps, in order: somebody has to become the administrator, and then the
 * wizard turns an empty template into a usable system. Both are one-time; once
 * they are behind you the app renders normally and neither reappears.
 */
export default function FirstTimeSetup({ children }) {
  const { effectiveUser, currentUser } = useAccessControl();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['first-time-setup-users'],
    queryFn: () => api.entities.User.list().catch(() => []),
    meta: { silent: true },
  });

  const hasAdmin = users.some(u => u.role === 'admin');

  const setupMutation = useMutation({
    mutationFn: async () => {
      const user = await api.entities.User.create({
        email: effectiveUser?.email,
        name: effectiveUser?.full_name || effectiveUser?.email,
        role: 'admin',
        is_admin: true,
      });
      // Also create a TeamMember so the admin appears in the user management list
      try {
        await api.entities.TeamMember.create({
          email: effectiveUser?.email,
          name: effectiveUser?.full_name || effectiveUser?.email,
          is_admin: true,
        });
      } catch { /* best effort */ }
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('הוגדרת כמנהל הראשי — טוען מחדש');
      window.location.reload();
    },
    // The one action that decides who owns the deployment. Failing it silently
    // leaves someone staring at a button that appears to do nothing.
    onError: (e) => toast.error(e?.message || 'ההגדרה כמנהל ראשי נכשלה'),
  });

  const isAdmin = isAdminUser(effectiveUser) || isAdminUser(currentUser);

  // The administrator exists — now the opening wizard, once.
  if (isLoading || hasAdmin || isAdmin) {
    const done = !!currentUser?.[ONBOARDING_KEY];
    if (!isLoading && isAdmin && !done) {
      return <OnboardingWizard onDone={() => queryClient.invalidateQueries()} />;
    }
    return children;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ברוכים הבאים!</h1>
          <p className="text-muted-foreground mt-2">
            זו הפעם הראשונה שאתם נכנסים למערכת. כדי להתחיל, יש להגדיר את עצמכם כמנהל הראשי.
          </p>
        </div>
        <Button
          onClick={() => setupMutation.mutate()}
          disabled={setupMutation.isPending}
          className="w-full gap-2"
        >
          {setupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          הגדר כמנהל ראשי
        </Button>
        {setupMutation.isError && (
          <p className="text-sm text-destructive">שגיאה בהגדרת המנהל. נסה שנית.</p>
        )}
      </div>
    </div>
  );
}

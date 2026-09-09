import React from 'react';
import { Link } from 'react-router-dom';
import { Server, CheckCircle2, AlertTriangle, PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionCard from '@/components/shared/SectionCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { useServerRuntime } from '@/lib/runtimeCapabilities';
import { useI18n } from '@/lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// The one place that says whether this deployment has a backend.
//
// It replaces a row of "connect" buttons that led nowhere. Three states, said
// plainly, and the only action offered is the one that actually moves you
// forward: configuring Supabase.
// ─────────────────────────────────────────────────────────────────────────────

const STATES = {
  not_configured: {
    icon: Server,
    tone: 'neutral',
    label: 'לא מוגדר · דורש שרת',
    body: 'האינטגרציות, העוזר החכם ומעקב המיילים דורשים צד שרת. עד שיוגדר — הן אינן מוצגות במערכת.',
  },
  configured_not_connected: {
    icon: AlertTriangle,
    tone: 'warning',
    label: 'מוגדר · לא מחובר',
    body: 'קיימת הגדרת Supabase, אך החיבור אינו פעיל או שההגדרות אינן תקינות.',
  },
  connected: {
    icon: CheckCircle2,
    tone: 'success',
    label: 'מחובר',
    body: 'קיים צד שרת. האינטגרציות והיכולות שתלויות בו זמינות.',
  },
};

const fmtWhen = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
};

export default function ServerStatusCard() {
  const { t } = useI18n();
  const { hasServer, reason, config, isLoading } = useServerRuntime();

  if (isLoading) return null;

  const state = STATES[hasServer ? 'connected' : reason] || STATES.not_configured;
  const Icon = state.icon;
  const syncedAt = fmtWhen(config?.last_sync_at);

  return (
    <SectionCard title={t('מצב חיבור לשרת')} icon={Icon}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-1.5">
          <StatusBadge tone={state.tone} label={t(state.label)} />
          <p className="text-caption max-w-prose">{t(state.body)}</p>
          {hasServer && syncedAt && (
            <p className="text-[11px] text-muted-foreground">
              {t('סונכרן לאחרונה')}: <span dir="ltr">{syncedAt}</span>
            </p>
          )}
        </div>
        {!hasServer && (
          <Button asChild variant="outline" className="rounded-full h-9 px-4 text-sm gap-1.5 flex-shrink-0">
            <Link to="/settings?section=supabase">
              <PlugZap className="w-4 h-4 flex-shrink-0" />
              {t('הגדרת Supabase')}
            </Link>
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

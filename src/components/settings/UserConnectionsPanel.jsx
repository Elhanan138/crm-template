import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Users, Search, CheckCircle2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import SectionCard from '@/components/shared/SectionCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { OUTLOOK_CONNECTOR_ID } from '@/lib/outlookConnector';
import { TEAMS_CONNECTOR_ID } from '@/lib/teamsConnector';

export default function UserConnectionsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [linkCopied, setLinkCopied] = useState(null);

  const { data: status = [], isLoading } = useQuery({
    queryKey: ['user-connections-status'],
    queryFn: async () => {
      const res = await api.functions.invoke('userConnectionsStatus', {});
      return res.data?.status || [];
    },
    retry: false,
  });

  const filtered = status.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.email || '').includes(q) || (s.name || '').toLowerCase().includes(q);
  });

  const outlookConfigured = OUTLOOK_CONNECTOR_ID !== 'REPLACE_WITH_YOUR_OUTLOOK_CONNECTOR_ID';
  const teamsConfigured = TEAMS_CONNECTOR_ID !== 'REPLACE_WITH_YOUR_TEAMS_CONNECTOR_ID';

  const handleCopyLink = async (service, connectorId, email) => {
    if (!connectorId || connectorId.startsWith('REPLACE_WITH')) {
      toast.error('Connector ID לא הוגדר. יש לרשום את הקונקטור ב-workspace תחילה.');
      return;
    }
    try {
      const url = await api.connectors.connectAppUser(connectorId);
      await navigator.clipboard.writeText(url);
      setLinkCopied(`${service}:${email}`);
      toast.success(`קישור ${service} עבור ${email} הועתק — העבר למשתמש להשלמת החיבור`);
      setTimeout(() => setLinkCopied(null), 3000);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'שגיאה ביצירת קישור');
    }
  };

  const connectedCount = (field) => status.filter(s => s[field]).length;

  return (
    <SectionCard
      title="חיבורי Outlook ו-Teams למשתמשים"
      icon={Users}
      actions={
        <span className="text-xs text-muted-foreground">
          Outlook: {connectedCount('outlook_connected')}/{status.length} · Teams: {connectedCount('teams_connected')}/{status.length}
        </span>
      }
    >
      <div className="space-y-3">
        <p className="text-caption">
          צור קישור התחברות עבור כל משתמש ושלח אליו — המשתמש ילחץ על הקישור ויאשר את החיבור בעצמו מול מיקרוסופט.
        </p>

        {!outlookConfigured || !teamsConfigured ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-muted text-warning text-xs">
            <span className="font-semibold">שים לב:</span>
            <span>
              {!outlookConfigured && 'מזהה Outlook connector עדיין placeholder. '}
              {!teamsConfigured && 'מזהה Teams connector עדיין placeholder. '}
              יש לרשום את הקונקטורים ב-workspace ולהזין את המזהים בקוד כדי שהכפתורים יעבדו.
            </span>
          </div>
        ) : null}

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או אימייל…"
            className="pr-9 h-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-caption">
            <Loader2 className="w-4 h-4 animate-spin" /> טוען משתמשים…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-caption py-4 text-center">לא נמצאו משתמשים.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-muted/50 text-caption font-semibold border-b border-border">
              <span>משתמש</span>
              <span className="text-center w-24">Outlook</span>
              <span className="text-center w-24">Teams</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {filtered.map(u => (
                <div key={u.email} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 items-center hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name || u.email}</p>
                    {u.name && <p className="text-xs text-muted-foreground truncate" dir="ltr">{u.email}</p>}
                  </div>
                  <div className="w-24 flex flex-col items-center gap-1">
                    {u.outlook_connected ? (
                      <StatusBadge tone="success" label="מחובר" />
                    ) : (
                      <StatusBadge tone="neutral" label="לא מחובר" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      disabled={!outlookConfigured}
                      onClick={() => handleCopyLink('Outlook', OUTLOOK_CONNECTOR_ID, u.email)}
                    >
                      {linkCopied === `outlook:${u.email}` ? (
                        <><CheckCircle2 className="w-3 h-3 text-success" /> הועתק</>
                      ) : (
                        <><Link2 className="w-3 h-3" /> קישור</>
                      )}
                    </Button>
                  </div>
                  <div className="w-24 flex flex-col items-center gap-1">
                    {u.teams_connected ? (
                      <StatusBadge tone="success" label="מחובר" />
                    ) : (
                      <StatusBadge tone="neutral" label="לא מחובר" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      disabled={!teamsConfigured}
                      onClick={() => handleCopyLink('Teams', TEAMS_CONNECTOR_ID, u.email)}
                    >
                      {linkCopied === `teams:${u.email}` ? (
                        <><CheckCircle2 className="w-3 h-3 text-success" /> הועתק</>
                      ) : (
                        <><Link2 className="w-3 h-3" /> קישור</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
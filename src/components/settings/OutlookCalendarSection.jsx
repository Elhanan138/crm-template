import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Loader2, Mail, Calendar, RefreshCw, MoreVertical, CheckCircle2, XCircle, Unlink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  useOutlookCalendarConfig,
  useOutlookSyncSettings,
  useIntegrationStatus,
  useOutlookAdminUsers,
  useAdminSyncAction,
  useSaveSetting,
} from '@/hooks/useOutlookCalendar';
import SectionCard from '@/components/shared/SectionCard';
import StatusBadge from '@/components/shared/StatusBadge';
import Field from '@/components/shared/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/formatDate';
import MockDataPanel from '@/components/settings/MockDataPanel';
import DirectorySyncPanel from '@/components/settings/DirectorySyncPanel';

const SETTING_KEYS = {
  integration_mode: { label: 'מצב פעולה', type: 'select', options: [{ value: 'mock', label: 'נתוני בדיקה (Mock)' }, { value: 'live', label: 'חיבור אמיתי (Live)' }], field: 'mode', default: 'mock' },
  outlook_calendar_enabled: { label: 'הצגת יומן Outlook למשתמשים', type: 'switch', field: 'enabled', default: false },
  outlook_sync_enabled: { label: 'סנכרון אוטומטי מופעל', type: 'switch', field: 'enabled', default: false },
  outlook_sync_hour: { label: 'שעת סנכרון יומית', type: 'number', field: 'hour', default: 6, min: 0, max: 23 },
  outlook_sync_backfill_days: { label: 'ימי backfill אחורה', type: 'number', field: 'days', default: 7, min: 0, max: 30 },
  outlook_sync_forward_days: { label: 'ימי תחזית קדימה', type: 'number', field: 'days', default: 60, min: 7, max: 180 },
  outlook_sync_throttle_minutes: { label: 'דקות throttle', type: 'number', field: 'minutes', default: 5, min: 1, max: 60 },
  teams_attendance_enabled: { label: 'דוחות נוכחות Teams', type: 'switch', field: 'enabled', default: false },
  teams_attendance_min_seconds: { label: 'מינימום שניות נוכחות', type: 'number', field: 'seconds', default: 300, min: 0, max: 3600 },
  teams_prefer_actual_duration: { label: 'העדפת משך בפועל', type: 'switch', field: 'enabled', default: true },
  teams_transcript_enabled: { label: 'תמלולים אוטומטיים Teams', type: 'switch', field: 'enabled', default: false },
  teams_transcript_auto_summarize: { label: 'סיכום אוטומטי לתמלולים', type: 'switch', field: 'enabled', default: true },
  directory_sync_enabled: { label: 'סנכרון דירקטורי Entra ID', type: 'switch', field: 'enabled', default: false },
  directory_sync_auto: { label: 'סנכרון אוטומטי יומי', type: 'switch', field: 'enabled', default: false },
};

function SettingRow({ settingKey, settings, onSave }) {
  const cfg = SETTING_KEYS[settingKey];
  const value = settings[settingKey]?.[cfg.field] ?? cfg.default;
  const [localValue, setLocalValue] = useState(value);

  React.useEffect(() => { setLocalValue(value); }, [value]);

  const handleSave = (newValue) => {
    const val = newValue !== undefined ? newValue : localValue;
    onSave({ key: settingKey, value: { [cfg.field]: val } });
  };

  if (cfg.type === 'switch') {
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <span className="text-sm text-foreground">{cfg.label}</span>
        <Switch checked={!!localValue} onCheckedChange={(v) => { setLocalValue(v); handleSave(v); }} />
      </div>
    );
  }

  if (cfg.type === 'select') {
    return (
      <Field label={cfg.label}>
        <Select value={localValue} onValueChange={(v) => { setLocalValue(v); handleSave(v); }}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            {cfg.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (cfg.type === 'number') {
    return (
      <Field label={cfg.label} help={`${cfg.min}–${cfg.max}`}>
        <Input
          type="number"
          min={cfg.min}
          max={cfg.max}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => handleSave()}
          className="h-9"
        />
      </Field>
    );
  }

  return null;
}

export default function OutlookCalendarSection() {
  const queryClient = useQueryClient();
  const { data: config = {}, isLoading } = useOutlookCalendarConfig();
  const isAdmin = config.enabled;
  const { data: settings = {}, isLoading: settingsLoading } = useOutlookSyncSettings(isAdmin);
  const { data: integrationStatus = {}, isLoading: statusLoading } = useIntegrationStatus(isAdmin);
  const { data: adminUsers = [], isLoading: usersLoading } = useOutlookAdminUsers(isAdmin);
  const adminAction = useAdminSyncAction();
  const saveSetting = useSaveSetting();
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [liveSwitchOpen, setLiveSwitchOpen] = useState(false);

  const handleToggle = async (checked) => {
    try {
      await api.functions.invoke('outlookCalendarConfig', { action: 'set', enabled: checked });
      queryClient.invalidateQueries({ queryKey: ['outlook-calendar-config'] });
      toast.success(checked ? 'יומן Outlook הופעל לכל המשתמשים' : 'יומן Outlook כובה');
    } catch {
      toast.error('שגיאה בעדכון ההגדרה');
    }
  };

  const handleSettingSave = ({ key, value }) => {
    saveSetting.mutate(
      { key, value },
      { onSuccess: () => toast.success('הגדרה נשמרה'), onError: () => toast.error('שגיאה בשמירת הגדרה') }
    );
  };

  const handleSwitchToLive = async () => {
    setLiveSwitchOpen(false);
    const missing = [];
    for (const type of ['outlook', 'microsoft_teams']) {
      if (!integrationStatus[type]?.connected) missing.push(type);
    }
    if (missing.length > 0) {
      toast.error(`חסרים חיבורים: ${missing.join(', ')}`);
      return;
    }
    saveSetting.mutate(
      { key: 'integration_mode', value: { mode: 'live' } },
      { onSuccess: () => toast.success('עברת למצב Live'), onError: () => toast.error('שגיאה במעבר ל-Live') }
    );
  };

  const handleAdminAction = (action, email) => {
    adminAction.mutate(
      { action, target_email: email },
      {
        onSuccess: (data) => {
          if (action === 'force_sync') {
            toast.success(`סונכרן: ${data?.synced ?? 0} אירועים`);
          } else if (action === 'reset_token') {
            toast.success('Delta token אופס');
          } else if (action === 'disconnect') {
            toast.success('משתמש נותק');
          } else if (action === 'sync_all') {
            toast.success(`סונכרנו ${data?.results?.length ?? 0} משתמשים`);
          }
          queryClient.invalidateQueries({ queryKey: ['outlook-admin-users'] });
        },
        onError: () => toast.error('שגיאה בביצוע הפעולה'),
      }
    );
  };

  const handleSyncAll = () => {
    adminAction.mutate(
      { action: 'sync_all' },
      {
        onSuccess: (data) => toast.success(`סונכרנו ${data?.results?.length ?? 0} משתמשים`),
        onError: () => toast.error('שגיאה בסנכרון'),
      }
    );
  };

  if (isLoading) return null;

  const mode = settings.integration_mode?.mode || 'mock';

  return (
    <SectionCard
      title="יומן Outlook — אינטגרציה"
      icon={Calendar}
      actions={
        <StatusBadge
          label={mode === 'live' ? 'חיבור אמיתי' : 'נתוני בדיקה'}
          tone={mode === 'live' ? 'success' : 'warning'}
        />
      }
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 py-2 border-b border-border">
          <span className="text-sm text-foreground">הצגת יומן Outlook למשתמשים</span>
          <Switch checked={config.enabled || false} onCheckedChange={handleToggle} />
        </div>

        {config.enabled && (
          <>
            <div className="pt-3 pb-1">
              <h4 className="text-sm font-semibold text-foreground">סנכרון והגדרות</h4>
            </div>
            {settingsLoading ? (
              <div className="flex items-center gap-2 py-4 text-caption"><Loader2 className="w-3.5 h-3.5 animate-spin" /> טוען הגדרות…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <SettingRow settingKey="outlook_sync_enabled" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="outlook_sync_hour" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="outlook_sync_backfill_days" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="outlook_sync_forward_days" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="outlook_sync_throttle_minutes" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="teams_attendance_enabled" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="teams_attendance_min_seconds" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="teams_prefer_actual_duration" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="teams_transcript_enabled" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="teams_transcript_auto_summarize" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="directory_sync_enabled" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="directory_sync_auto" settings={settings} onSave={handleSettingSave} />
                <SettingRow settingKey="integration_mode" settings={settings} onSave={({ key, value }) => {
                  if (value.mode === 'live') { setLiveSwitchOpen(true); return; }
                  handleSettingSave({ key, value });
                }} />
              </div>
            )}

            <div className="pt-4 mt-2 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground mb-2">סטטוס חיבורים</h4>
              {statusLoading ? (
                <div className="flex items-center gap-2 py-2 text-caption"><Loader2 className="w-3.5 h-3.5 animate-spin" /> טוען…</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(integrationStatus).map(([type, s]) => (
                    <div key={type} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60">
                      {s.connected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium">{type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-foreground">משתמשים מחוברים</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 px-3 text-xs"
                  onClick={handleSyncAll}
                  disabled={adminAction.isPending}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  סנכרן את כולם
                </Button>
              </div>
              {usersLoading ? (
                <div className="flex items-center gap-2 py-2 text-caption"><Loader2 className="w-3.5 h-3.5 animate-spin" /> טוען…</div>
              ) : adminUsers.length === 0 ? (
                <p className="text-caption py-2">אין משתמשים מחוברים עדיין.</p>
              ) : (
                <div className="space-y-1">
                  {adminUsers.map((u) => (
                    <div key={u.email} className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                          <Mail className="w-3.5 h-3.5 text-accent-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{u.name || u.email}</p>
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">{u.email}</p>
                          {u.last_error && (
                            <p className="text-xs text-destructive truncate mt-0.5">{u.last_error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {u.last_sync_at && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(u.last_sync_at, 'short-padded')}</span>
                        )}
                        <StatusBadge
                          tone={u.last_sync_status === 'ok' ? 'success' : u.last_sync_status === 'throttled' ? 'warning' : 'destructive'}
                          label={u.last_sync_status === 'ok' ? 'תקין' : u.last_sync_status === 'throttled' ? 'ממתין' : 'שגיאה'}
                        />
                        <span className="text-xs text-muted-foreground hidden md:inline">{u.pending_count} ממתינים</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label="פעולות">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" dir="rtl">
                            <DropdownMenuItem onClick={() => handleAdminAction('force_sync', u.email)}>
                              <RefreshCw className="w-3.5 h-3.5" /> סנכרן עכשיו
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdminAction('reset_token', u.email)}>
                              <RotateCcw className="w-3.5 h-3.5" /> אפס delta token
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDisconnectTarget(u)}>
                              <Unlink className="w-3.5 h-3.5" /> נתק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={liveSwitchOpen} onOpenChange={setLiveSwitchOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מעבר למצב Live</AlertDialogTitle>
            <AlertDialogDescription>
              מצב Live דורש חיבור פעיל ל-Outlook ו-Microsoft Teams. כל הנתונים יסונכרנו מ-Graph API האמיתי שלך.
              {!integrationStatus.outlook?.connected && ' חסר חיבור Outlook.'}
              {!integrationStatus.microsoft_teams?.connected && ' חסר חיבור Teams.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleSwitchToLive}
              disabled={!integrationStatus.outlook?.connected || !integrationStatus.microsoft_teams?.connected}
            >
              אשר מעבר
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>ניתוק משתמש</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectTarget?.email ? `ניתוק ${disconnectTarget.email}` : 'ניתוק משתמש'}. הסנכרון יופסק ורשומת הסנכרון תימחק. אירועים מתועדים לא יימחקו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { handleAdminAction('disconnect', disconnectTarget?.email); setDisconnectTarget(null); }}
            >
              נתק
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MockDataPanel isAdmin={isAdmin} isLive={mode === 'live'} />

      {config.enabled && isAdmin && <DirectorySyncPanel />}
    </SectionCard>
  );
}
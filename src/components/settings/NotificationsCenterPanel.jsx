import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BellRing, Clock, CalendarX, Play } from 'lucide-react';
import { toast } from 'sonner';
import AllNotificationsTable from './notifications/AllNotificationsTable';

const WEEK_DAYS = [
  { id: 0, label: 'א' }, { id: 1, label: 'ב' }, { id: 2, label: 'ג' },
  { id: 3, label: 'ד' }, { id: 4, label: 'ה' }, { id: 5, label: 'ו' }, { id: 6, label: 'ש' },
];

export default function NotificationsCenterPanel() {
  const queryClient = useQueryClient();

  // --- Master switches ---
  const { data: masterRes, isLoading: masterLoading } = useQuery({
    queryKey: ['notifications-master'],
    queryFn: () => api.functions.invoke('globalTabVisibility', { settingKey: 'notifications_master' }),
    retry: 1, meta: { silent: true },
  });
  const master = masterRes?.data?.value || { all: true, bell: true, email: true };

  const toggleMaster = useMutation({
    mutationFn: ({ tabId, enabled }) => api.functions.invoke('globalTabVisibility', { action: 'set', settingKey: 'notifications_master', tabId, enabled }),
    onSuccess: (_r, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications-master'] });
      toast.success(enabled ? 'ההתראות הופעלו' : 'ההתראות כובו');
    },
    onError: (e) => toast.error(e?.message || 'שינוי מצב ההתראות נכשל'),
  });

  // --- Heartbeat config ---
  const { data: hbRes } = useQuery({
    queryKey: ['heartbeat-config'],
    queryFn: () => api.functions.invoke('notificationsAdmin', { action: 'getConfig', settingKey: 'alerts_heartbeat_config' }),
    retry: 1, meta: { silent: true },
  });
  const hbConfig = hbRes?.data?.value || {};

  const saveHb = useMutation({
    mutationFn: (value) => api.functions.invoke('notificationsAdmin', { action: 'setConfig', settingKey: 'alerts_heartbeat_config', value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heartbeat-config'] });
      toast.success('תצורת ה-heartbeat נשמרה');
    },
    onError: () => toast.error('שמירה נכשלה'),
  });

  // --- Undocumented meetings config ---
  const { data: umRes } = useQuery({
    queryKey: ['undocumented-config'],
    queryFn: () => api.functions.invoke('notificationsAdmin', { action: 'getConfig', settingKey: 'undocumented_meetings_config' }),
    retry: 1, meta: { silent: true },
  });
  const umConfig = umRes?.data?.value || {};

  const saveUm = useMutation({
    mutationFn: (value) => api.functions.invoke('notificationsAdmin', { action: 'setConfig', settingKey: 'undocumented_meetings_config', value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['undocumented-config'] });
      toast.success('תצורת סריקת פגישות נשמרה');
    },
    onError: () => toast.error('שמירה נכשלה'),
  });

  // --- Preview (undocumented meetings count) ---
  const { data: previewRes } = useQuery({
    queryKey: ['undocumented-preview'],
    queryFn: () => api.functions.invoke('notificationsAdmin', { action: 'preview' }),
    retry: 1, meta: { silent: true },
  });
  const previewCount = previewRes?.data?.count || 0;
  const previewMinDays = previewRes?.data?.minDaysPending ?? 3;

  // --- Status (last run timestamps) ---
  const { data: statusRes } = useQuery({
    queryKey: ['notifications-status'],
    queryFn: () => api.functions.invoke('notificationsAdmin', { action: 'getStatus' }),
    retry: 1, meta: { silent: true },
  });
  const status = statusRes?.data || {};

  // --- All notifications list ---
  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ['all-notifications'],
    queryFn: () => api.functions.invoke('notificationsAdmin', { action: 'list' }),
    retry: 1, meta: { silent: true },
  });
  const allItems = listRes?.data?.items || [];

  // --- Run now ---
  const runNow = useMutation({
    mutationFn: (target) => api.functions.invoke('notificationsAdmin', { action: 'runNow', target }),
    onSuccess: (res, target) => {
      const r = res?.data?.result || {};
      const msg = target === 'reminders'
        ? `נסרקו ${r.scanned || 0}, נשלחו ${r.sent || 0}`
        : target === 'alerts'
          ? `נבדקו ${r.alertsChecked || 0}, נשלחו ${r.alertsSent || 0}`
          : `נסרקו ${r.scanned || 0}, הודעות נשלחו: ${r.notified || 0}`;
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['notifications-status'] });
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
    },
    onError: () => toast.error('ההרצה נכשלה'),
  });

  // --- Local state for heartbeat editing ---
  const [hbDraft, setHbDraft] = useState(null);
  const hb = hbDraft || {
    enabled: hbConfig.enabled !== false,
    start_hour: hbConfig.start_hour ?? 8,
    end_hour: hbConfig.end_hour ?? 18,
    days: hbConfig.days ?? [0, 1, 2, 3, 4],
    frequency_minutes: hbConfig.frequency_minutes ?? 15,
  };

  // --- Local state for undocumented editing ---
  const [umDraft, setUmDraft] = useState(null);
  const um = umDraft || {
    enabled: umConfig.enabled !== false,
    min_days_pending: umConfig.min_days_pending ?? 3,
    frequency_hours: umConfig.frequency_hours ?? 72,
    recipients_mode: umConfig.recipients_mode || 'owner',
    custom_emails: Array.isArray(umConfig.custom_emails) ? umConfig.custom_emails : [],
    channels: umConfig.channels || { bell: true, email: false },
  };

  const fmtTime = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  };

  const toggleDay = (dayId) => {
    const days = hb.days.includes(dayId) ? hb.days.filter(d => d !== dayId) : [...hb.days, dayId];
    setHbDraft({ ...hb, days });
  };

  return (
    <div className="space-y-5">
      {/* ═══ Card A: Master switches ═══ */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <BellRing className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">מתגי אב</h3>
            <p className="text-[11px] text-muted-foreground">שליטה גלובלית בכל שיגור התראות ומיילים מהמערכת</p>
          </div>
        </div>

        {masterLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
              <div>
                <span className="text-sm font-medium text-foreground">כל ההתראות</span>
                <p className="text-[11px] text-muted-foreground">כיבוי מיידי של כל השיגורים</p>
              </div>
              <Switch
                checked={master.all}
                onCheckedChange={(v) => toggleMaster.mutate({ tabId: 'all', enabled: v })}
                disabled={toggleMaster.isPending}
              />
            </div>

            <div className={`flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 transition-opacity ${!master.all ? 'opacity-40' : ''}`}>
              <div>
                <span className="text-sm font-medium text-foreground">פעמון</span>
                <p className="text-[11px] text-muted-foreground">התראות בתוך המערכת</p>
              </div>
              <Switch
                checked={master.bell}
                onCheckedChange={(v) => toggleMaster.mutate({ tabId: 'bell', enabled: v })}
                disabled={!master.all || toggleMaster.isPending}
              />
            </div>

            <div className={`flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 transition-opacity ${!master.all ? 'opacity-40' : ''}`}>
              <div>
                <span className="text-sm font-medium text-foreground">מייל</span>
                <p className="text-[11px] text-muted-foreground">שליחת מיילים מהמערכת</p>
              </div>
              <Switch
                checked={master.email}
                onCheckedChange={(v) => toggleMaster.mutate({ tabId: 'email', enabled: v })}
                disabled={!master.all || toggleMaster.isPending}
              />
            </div>

            {!master.all && (
              <p className="text-[11px] text-warning bg-warning-muted rounded-lg px-3 py-2">
                כל שיגור התראות ומיילים מהמערכת מושבת. תזכורות שהגיע זמנן יישמרו כממתינות וישלחו עם הפעלה מחדש.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ Card B: Heartbeat timing ═══ */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">תזמון (Heartbeat)</h3>
            <p className="text-[11px] text-muted-foreground">שעות ותדירות ריצת סריקת האלרטים</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium">אלרטים פעילים</span>
            <Switch
              checked={hb.enabled}
              onCheckedChange={(v) => setHbDraft({ ...hb, enabled: v })}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">שעת התחלה</label>
              <Input type="number" min={0} max={23} value={hb.start_hour} onChange={(e) => setHbDraft({ ...hb, start_hour: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">שעת סיום</label>
              <Input type="number" min={0} max={23} value={hb.end_hour} onChange={(e) => setHbDraft({ ...hb, end_hour: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">תדירות (דקות)</label>
              <Input type="number" min={1} value={hb.frequency_minutes} onChange={(e) => setHbDraft({ ...hb, frequency_minutes: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">ימים פעילים</label>
            <div className="flex gap-1">
              {WEEK_DAYS.map(d => (
                <button
                  key={d.id}
                  onClick={() => toggleDay(d.id)}
                  className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${hb.days.includes(d.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status row */}
          <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">ריצת אלרטים אחרונה:</span>
              <span className="text-foreground font-medium">{fmtTime(status.alertsLastRun)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">ריצת תזכורות אחרונה:</span>
              <span className="text-foreground font-medium">{fmtTime(status.remindersLastRun)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">התראות שנשלחו היום:</span>
              <span className="text-foreground font-medium">{status.alertsSentToday ?? '—'}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">תזכורות אישיות נשלחות תמיד, גם מחוץ לחלון השעות.</p>

          <Button size="sm" onClick={() => saveHb.mutate(hb)} disabled={saveHb.isPending || !hbDraft} className="w-full">
            {saveHb.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            שמור תצורה
          </Button>
        </div>
      </div>

      {/* ═══ Card C: Undocumented meetings ═══ */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <CalendarX className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">פגישות שלא תועדו</h3>
            <p className="text-[11px] text-muted-foreground">סריקה תקופתית של פגישות מהיומן שטרם תועדו</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium">סריקה פעילה</span>
            <Switch checked={um.enabled} onCheckedChange={(v) => setUmDraft({ ...um, enabled: v })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">ימים מינימליים להמתנה</label>
              <Input type="number" min={0} value={um.min_days_pending} onChange={(e) => setUmDraft({ ...um, min_days_pending: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">תדירות סריקה (שעות)</label>
              <Input type="number" min={0.1} step={0.1} value={um.frequency_hours} onChange={(e) => setUmDraft({ ...um, frequency_hours: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">נמענים</label>
            <Select value={um.recipients_mode} onValueChange={(v) => setUmDraft({ ...um, recipients_mode: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">בעלי היומן</SelectItem>
                <SelectItem value="admins">אדמינים</SelectItem>
                <SelectItem value="custom">כתובות מותאמות</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {um.recipients_mode === 'custom' && (
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">כתובות מייל (מופרדות בפסיק)</label>
              <Input
                value={um.custom_emails.join(', ')}
                onChange={(e) => setUmDraft({ ...um, custom_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="h-8 text-sm"
                placeholder="a@b.com, c@d.com"
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={um.channels?.bell} onCheckedChange={(v) => setUmDraft({ ...um, channels: { ...um.channels, bell: v } })} />
              פעמון
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={um.channels?.email} onCheckedChange={(v) => setUmDraft({ ...um, channels: { ...um.channels, email: v } })} />
              מייל
            </label>
          </div>

          {/* Live preview */}
          <div className="rounded-lg bg-muted/30 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              כרגע <span className="font-bold text-foreground">{previewCount}</span> פגישות ממתינות לתיעוד מעל <span className="font-bold text-foreground">{previewMinDays}</span> ימים
            </p>
            <p className="text-[11px] text-muted-foreground">ריצה אחרונה: {fmtTime(status.undocumentedLastRun)}</p>
          </div>

          <Button size="sm" onClick={() => saveUm.mutate(um)} disabled={saveUm.isPending || !umDraft} className="w-full">
            {saveUm.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            שמור תצורה
          </Button>
        </div>
      </div>

      {/* ═══ Run now buttons ═══ */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Play className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">הרץ עכשיו</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => runNow.mutate('reminders')} disabled={runNow.isPending} className="text-xs">
            {runNow.isPending && runNow.variables === 'reminders' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            תזכורות
          </Button>
          <Button variant="outline" size="sm" onClick={() => runNow.mutate('alerts')} disabled={runNow.isPending} className="text-xs">
            {runNow.isPending && runNow.variables === 'alerts' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            אלרטים
          </Button>
          <Button variant="outline" size="sm" onClick={() => runNow.mutate('undocumented')} disabled={runNow.isPending} className="text-xs">
            {runNow.isPending && runNow.variables === 'undocumented' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            פגישות
          </Button>
        </div>
      </div>

      {/* ═══ Card D: All notifications table ═══ */}
      <AllNotificationsTable items={allItems} loading={listLoading} />
    </div>
  );
}
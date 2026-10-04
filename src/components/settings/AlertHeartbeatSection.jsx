import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

const DAY_LABELS = [
  { value: 0, label: 'א' },
  { value: 1, label: 'ב' },
  { value: 2, label: 'ג' },
  { value: 3, label: 'ד' },
  { value: 4, label: 'ה' },
  { value: 5, label: 'ו' },
  { value: 6, label: 'ש' },
];

export default function AlertHeartbeatSection() {
  const { t } = useI18n();
  const [config, setConfig] = useState({
    enabled: true,
    start_hour: 8,
    end_hour: 18,
    days: [0, 1, 2, 3, 4],
    frequency_minutes: 15,
  });
  const [settingId, setSettingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminderStatus, setReminderStatus] = useState({ lastRun: '', sent: 0, expired: 0, loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // B7: Fetch reminders last-run status
      try {
        const remItems = await api.entities.AppSetting.filter({ key: 'reminders_last_run' });
        if (!cancelled && remItems[0]?.value?.at) {
          const remDate = new Date(remItems[0].value.at);
          setReminderStatus(prev => ({ ...prev, lastRun: remDate.toLocaleString('he-IL'), loading: false }));
        } else if (!cancelled) {
          setReminderStatus(prev => ({ ...prev, loading: false }));
        }
      } catch { if (!cancelled) setReminderStatus(prev => ({ ...prev, loading: false })); }
      try {
        const items = await api.entities.AppSetting.filter({ key: 'alerts_heartbeat_config' });
        if (cancelled) return;
        if (items[0]) {
          const val = items[0].value || {};
          setSettingId(items[0].id);
          setConfig({
            enabled: val.enabled !== false,
            start_hour: val.start_hour ?? 8,
            end_hour: val.end_hour ?? 18,
            days: val.days ?? [0, 1, 2, 3, 4],
            frequency_minutes: val.frequency_minutes ?? 15,
          });
        }
      } catch (e) {
        // ignore — defaults remain
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...config };
      if (settingId) {
        await api.entities.AppSetting.update(settingId, { value: payload });
      } else {
        const created = await api.entities.AppSetting.create({ key: 'alerts_heartbeat_config', value: payload });
        if (created) setSettingId(created.id);
      }
      toast.success(t("הגדרות פעימות ההתראות נשמרו בהצלחה"));
    } catch (e) {
      toast.error(t("שמירת ההגדרות נכשלה"), { description: e?.message || 'אנא נסה שוב' });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    setConfig(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day].sort(),
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">{t("פעימות התראות אוטומטיות")}</CardTitle>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-caption">
          המערכת בודקת התראות פעם ב-15 דקות בשעות הפעילות שתגדיר להלן.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("תדירות בדיקה (בדקות)")}</Label>
          <input
            type="number"
            min={1}
            max={120}
            value={config.frequency_minutes}
            onChange={(e) => setConfig({ ...config, frequency_minutes: Math.max(1, Number(e.target.value) || 15) })}
            disabled={!config.enabled}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("שעת התחלה")}</Label>
            <Select
              value={String(config.start_hour)}
              onValueChange={(v) => setConfig({ ...config, start_hour: Number(v) })}
              disabled={!config.enabled}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("שעת סיום")}</Label>
            <Select
              value={String(config.end_hour)}
              onValueChange={(v) => setConfig({ ...config, end_hour: Number(v) })}
              disabled={!config.enabled}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("ימי פעילות")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                disabled={!config.enabled}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border ${
                  config.days.includes(day.value)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-input hover:bg-accent'
                } ${!config.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t(day.label)}
              </button>
            ))}
          </div>
        </div>

        {/* B7: Reminders dispatch status row */}
        {!reminderStatus.loading && (
          <div className="flex items-center justify-between pt-2 border-t text-caption">
            <span>שיגור תזכורות — ריצה אחרונה: {reminderStatus.lastRun || 'אין עדיין'}</span>
            {reminderStatus.sent > 0 && <span> · נשלחו: {reminderStatus.sent} · פגו: {reminderStatus.expired}</span>}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs gap-1.5"
          >
            {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            שמור
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
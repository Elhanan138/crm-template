import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Field from '@/components/shared/Field';
import DateField from '@/components/ui/date-field';
import TimeField from '@/components/ui/time-field';
import {
  TRIGGER_CATALOG,
  DATE_ANCHORS,
  DIRECTIONS,
  HOURS_BANKS,
  WEEK_DAYS,
  RECURRING_FREQUENCIES,
} from './alertConfig';

const EMPTY_FORM = {
  recipient_email: '',
  trigger: '',
  config: {},
  channels: { bell: true, email: false },
  message: '',
  active: true,
};

export default function ProjectAlertForm({
  initialData,
  recipients,
  onSubmit,
  onCancel,
  isSubmitting,
}) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...EMPTY_FORM,
        ...initialData,
        config: { ...(initialData.config || {}) },
        channels: { ...(initialData.channels || { bell: true, email: false }) },
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initialData]);

  const triggerCfg = TRIGGER_CATALOG.find(t => t.id === form.trigger);
  const configFields = triggerCfg?.configFields || [];

  const updateConfig = (key, value) => {
    setForm(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const updateChannel = (key, checked) => {
    setForm(prev => ({ ...prev, channels: { ...prev.channels, [key]: checked } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.recipient_email) return;
    if (!form.trigger) return;
    if (!form.channels.bell && !form.channels.email) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <Field label="נמען" htmlFor="recipient_email" required>
        <Select value={form.recipient_email} onValueChange={(v) => setForm(prev => ({ ...prev, recipient_email: v }))}>
          <SelectTrigger id="recipient_email"><SelectValue placeholder="בחר נמען" /></SelectTrigger>
          <SelectContent dir="rtl">
            {recipients.map(r => (
              <SelectItem key={r.email} value={r.email}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="טריגר" htmlFor="trigger" required>
        <Select
          value={form.trigger}
          onValueChange={(v) => setForm(prev => ({ ...prev, trigger: v, config: {} }))}
        >
          <SelectTrigger id="trigger"><SelectValue placeholder="בחר טריגר" /></SelectTrigger>
          <SelectContent dir="rtl">
            {TRIGGER_CATALOG.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex flex-col">
                  <span>{t.label}</span>
                  <span className="text-[10px] text-muted-foreground">{t.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Dynamic config fields */}
      {configFields.includes('anchor') && (
        <Field label="עוגן תאריך" htmlFor="anchor" required>
          <Select value={form.config.anchor || ''} onValueChange={(v) => updateConfig('anchor', v)}>
            <SelectTrigger id="anchor"><SelectValue placeholder="בחר עוגן" /></SelectTrigger>
            <SelectContent dir="rtl">
              {DATE_ANCHORS.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {configFields.includes('direction') && (
        <Field label="כיוון" htmlFor="direction" required>
          <Select value={form.config.direction || ''} onValueChange={(v) => updateConfig('direction', v)}>
            <SelectTrigger id="direction"><SelectValue placeholder="בחר כיוון" /></SelectTrigger>
            <SelectContent dir="rtl">
              {DIRECTIONS.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {configFields.includes('days') && (
        <Field label="מספר ימים" htmlFor="days" required help="0 = ביום התאריך עצמו">
          <Input
            id="days"
            type="number"
            min="0"
            value={form.config.days ?? ''}
            onChange={(e) => updateConfig('days', Number(e.target.value))}
            placeholder="0"
          />
        </Field>
      )}

      {configFields.includes('bank') && (
        <Field label="בנק שעות" htmlFor="bank" required>
          <Select value={form.config.bank || ''} onValueChange={(v) => updateConfig('bank', v)}>
            <SelectTrigger id="bank"><SelectValue placeholder="בחר בנק" /></SelectTrigger>
            <SelectContent dir="rtl">
              {HOURS_BANKS.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {configFields.includes('threshold_percent') && (
        <Field label="סף ניצול (%)" htmlFor="threshold_percent" required help="מתי ישלח הפעמון — ברירת מחדל לפי הגדרת הפרויקט">
          <Input
            id="threshold_percent"
            type="number"
            min="1"
            max="100"
            value={form.config.threshold_percent ?? 80}
            onChange={(e) => updateConfig('threshold_percent', Number(e.target.value))}
            placeholder="80"
          />
        </Field>
      )}

      {configFields.includes('datetime') && (
        <Field label="תאריך ושעה" htmlFor="datetime" required>
          <DateField
            value={form.config.datetime || null}
            onChange={(v) => updateConfig('datetime', v)}
            withTime
            placeholder="בחר תאריך ושעה"
          />
        </Field>
      )}

      {configFields.includes('frequency') && (
        <Field label="תדירות" htmlFor="frequency" required>
          <Select value={form.config.frequency || ''} onValueChange={(v) => updateConfig('frequency', v)}>
            <SelectTrigger id="frequency"><SelectValue placeholder="בחר תדירות" /></SelectTrigger>
            <SelectContent dir="rtl">
              {RECURRING_FREQUENCIES.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {configFields.includes('day') && (
        <Field label={form.config.frequency === 'monthly' ? 'יום בחודש (1-31)' : 'יום בשבוע'} htmlFor="day" required>
          {form.config.frequency === 'monthly' ? (
            <Input
              id="day"
              type="number"
              min="1"
              max="31"
              value={form.config.day ?? ''}
              onChange={(e) => updateConfig('day', Number(e.target.value))}
              placeholder="1"
            />
          ) : (
            <Select value={form.config.day !== undefined ? String(form.config.day) : ''} onValueChange={(v) => updateConfig('day', Number(v))}>
              <SelectTrigger id="day"><SelectValue placeholder="בחר יום" /></SelectTrigger>
              <SelectContent dir="rtl">
                {WEEK_DAYS.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}

      {configFields.includes('time') && (
        <Field label="שעה" htmlFor="time" required>
          <TimeField
            value={form.config.time || '09:00'}
            onChange={(v) => updateConfig('time', v)}
            placeholder="בחר שעה"
          />
        </Field>
      )}

      <Field label="ערוצים" required help="לפחות ערוץ אחד חובה">
        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.channels.bell}
              onCheckedChange={(v) => updateChannel('bell', !!v)}
            />
            <span className="text-sm">פעמון במערכת</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.channels.email}
              onCheckedChange={(v) => updateChannel('email', !!v)}
            />
            <span className="text-sm">אימייל</span>
          </label>
        </div>
      </Field>

      <Field label="הודעה" htmlFor="message" help="טקסט חופשי שיצורף להתראה (אופציונלי)">
        <Textarea
          id="message"
          value={form.message || ''}
          onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
          rows={2}
          placeholder="הודעה נוספת לנמען..."
        />
      </Field>

      <div className="flex justify-start gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="rounded-full">
          {isSubmitting ? 'שומר...' : 'שמור התראה'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-full">
          ביטול
        </Button>
      </div>
    </form>
  );
}
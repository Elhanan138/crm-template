import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Plus, Trash2, Loader2, Save, Zap, Filter, PlayCircle, FlaskConical, Server } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { previewRule } from '@/api/automationRunner';
import { useHasServer } from '@/lib/runtimeCapabilities';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  AUTOMATION_SUBJECTS, AUTOMATION_EVENTS, AUTOMATION_ACTIONS,
  CONDITION_OPERATORS, RUN_MODES, subjectMeta,
} from '@/lib/crm/schemas';

const CONTROL = 'h-9 rounded-lg border-border bg-background text-sm';

const emptyRule = {
  name: '', subject: 'Lead', event: 'created', field: '', days: '',
  conditions: [], actions: [{ type: 'create_task', field: '', value: '' }],
  active: true, run_mode: 'auto', description: '',
};

const Block = ({ icon: Icon, title, hint, children, onAdd, addLabel }) => (
  <section className="rounded-xl border border-border bg-card p-3.5 space-y-3">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold leading-tight">{title}</h4>
          {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
        </div>
      </div>
      {onAdd && (
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-shrink-0" onClick={onAdd}>
          <Plus className="w-3 h-3" /> {addLabel}
        </Button>
      )}
    </div>
    {children}
  </section>
);

// Option labels come from the declarations in src/lib/crm/schemas.js and are
// translated here, at the one place every picker in the builder renders.
const Picker = ({ value, onChange, options, placeholder, className = '' }) => {
  const { t, dir } = useI18n();
  return (
    <Select value={value === '' || value === undefined ? undefined : String(value)} onValueChange={onChange}>
      <SelectTrigger className={`${CONTROL} ${className}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent dir={dir}>
        {options.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{t(o.label)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

export default function AutomationBuilder({ open, onOpenChange, rule, onSave, saving, readOnly }) {
  const { t, dir } = useI18n();
  const [form, setForm] = useState(() => ({ ...emptyRule, ...(rule || {}) }));
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setPreview(null); };
  const { hasServer } = useHasServer();

  // The dry run. "Run now" acts; this only counts, so a rule can be checked
  // before it is allowed to create twenty tasks.
  const [preview, setPreview] = useState(null);
  const { refetch: loadSubject, isFetching: previewing } = useQuery({
    queryKey: ['crm', form.subject, 'preview'],
    queryFn: () => api.entities[form.subject].list(),
    enabled: false,
  });
  const runPreview = async () => {
    const { data = [] } = await loadSubject();
    setPreview(previewRule(form, data));
  };

  const subject = subjectMeta(form.subject) || AUTOMATION_SUBJECTS[0];
  const event = AUTOMATION_EVENTS.find((e) => e.value === form.event) || AUTOMATION_EVENTS[0];
  const fieldOptions = subject.fields.map((f) => ({ value: f.key, label: f.label }));
  const dateFields = subject.fields.filter((f) => f.type === 'date').map((f) => ({ value: f.key, label: f.label }));

  const patchAt = (key, index, patch) =>
    set({ [key]: form[key].map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  const removeAt = (key, index) => set({ [key]: form[key].filter((_, i) => i !== index) });

  // Changing the subject invalidates every field reference in the rule.
  const changeSubject = (value) =>
    set({
      subject: value,
      field: '',
      conditions: form.conditions.map((c) => ({ ...c, field: '' })),
      actions: form.actions.map((a) => ({ ...a, field: '' })),
    });

  const submit = () => {
    if (!form.name.trim()) return toast.error(t('שם הכלל חובה'));
    if ((event.needsField || event.needsDays) && event.needsField && !form.field) {
      return toast.error(t('בחר את השדה שהטריגר מתייחס אליו'));
    }
    if (event.needsDays && !String(form.days).trim()) return toast.error(t('בחר מספר ימים'));
    if (form.actions.length === 0) return toast.error(t('כלל בלי פעולה לא יעשה כלום'));
    // A condition with no field compares an empty key and quietly decides the
    // rule for every record.
    if (form.conditions.some((c) => !c.field)) return toast.error(t('בחר שדה לכל תנאי, או הסר אותו'));
    const badAction = form.actions.find((a) => {
      const meta = AUTOMATION_ACTIONS.find((m) => m.value === a.type);
      return meta?.needsField ? !a.field : !String(a.value ?? '').trim();
    });
    if (badAction) return toast.error(t('יש להשלים את פרטי כל הפעולות'));
    onSave(form);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} dir={dir} className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border text-start">
          <SheetTitle>{rule?.id ? t('עריכת כלל') : t('כלל חדש')}</SheetTitle>
          <SheetDescription>{t('מתי הכלל רץ, על מה הוא מסתכל, ומה הוא עושה.')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">{t('שם הכלל')} <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} disabled={readOnly}
              placeholder={t('מה הכלל עושה')} className={CONTROL} />
          </div>

          <Block icon={Zap} title={t('מתי')} hint={t('הישות והאירוע שמפעילים את הכלל')}>
            <div className="grid grid-cols-2 gap-2">
              <Picker value={form.subject} onChange={changeSubject} options={AUTOMATION_SUBJECTS} placeholder={t('ישות')} />
              <Picker value={form.event} onChange={(v) => set({ event: v, field: '' })} options={AUTOMATION_EVENTS} placeholder={t('אירוע')} />
              {event.needsField && (
                <Picker
                  value={form.field}
                  onChange={(v) => set({ field: v })}
                  options={form.event.startsWith('date_') ? dateFields : fieldOptions}
                  placeholder={t('שדה')}
                />
              )}
              {event.needsDays && (
                <Input type="number" inputMode="numeric" dir="ltr" value={form.days}
                  onChange={(e) => set({ days: e.target.value })} placeholder={t('מספר ימים')} className={CONTROL} />
              )}
            </div>
          </Block>

          <Block
            icon={Filter}
            title={t('תנאים')}
            hint={form.conditions.length ? t('כל התנאים חייבים להתקיים') : t('ללא תנאים — הכלל ירוץ תמיד')}
            onAdd={readOnly ? undefined : () => set({ conditions: [...form.conditions, { field: '', operator: 'eq', value: '' }] })}
            addLabel={t('תנאי')}
          >
            {form.conditions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">{t('אין תנאים')}</p>
            ) : (
              <div className="space-y-2">
                {form.conditions.map((cond, i) => {
                  const operator = cond.operator ?? cond.op;
                  const opMeta = CONDITION_OPERATORS.find((o) => o.value === operator);
                  const fieldMeta = subject.fields.find((f) => f.key === cond.field);
                  return (
                    <div key={i} className="flex gap-1.5 items-start">
                      <Picker value={cond.field} onChange={(v) => patchAt('conditions', i, { field: v, value: '' })}
                        options={fieldOptions} placeholder={t('שדה')} className="flex-1" />
                      <Picker value={operator} onChange={(v) => patchAt('conditions', i, { operator: v, op: undefined })}
                        options={CONDITION_OPERATORS} placeholder={t('תנאי')} className="w-28 flex-shrink-0" />
                      {!opMeta?.noValue && (
                        fieldMeta?.options
                          ? <Picker value={cond.value} onChange={(v) => patchAt('conditions', i, { value: v })}
                              options={fieldMeta.options} placeholder={t('ערך')} className="flex-1" />
                          : <Input value={cond.value} onChange={(e) => patchAt('conditions', i, { value: e.target.value })}
                              placeholder={t('ערך')} className={`${CONTROL} flex-1`}
                              type={opMeta?.numeric || fieldMeta?.type === 'number' ? 'number' : 'text'} />
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-8 text-destructive flex-shrink-0"
                        onClick={() => removeAt('conditions', i)} aria-label={t('הסר תנאי')}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Block>

          <Block
            icon={PlayCircle}
            title={t('פעולות')}
            hint={t('רצות לפי הסדר')}
            onAdd={readOnly ? undefined : () => set({ actions: [...form.actions, { type: 'create_task', field: '', value: '' }] })}
            addLabel={t('פעולה')}
          >
            <div className="space-y-2">
              {form.actions.map((action, i) => {
                const meta = AUTOMATION_ACTIONS.find((a) => a.value === action.type);
                return (
                  <div key={i} className="flex flex-wrap gap-1.5 items-start">
                    <Picker value={action.type} onChange={(v) => patchAt('actions', i, { type: v, field: '', value: '' })}
                      options={AUTOMATION_ACTIONS} placeholder={t('פעולה')} className="flex-1" />
                    {meta?.needsField && (
                      <Picker value={action.field} onChange={(v) => patchAt('actions', i, { field: v })}
                        options={fieldOptions} placeholder={t('שדה')} className="w-32 flex-shrink-0" />
                    )}
                    <Input value={action.value} onChange={(e) => patchAt('actions', i, { value: e.target.value })}
                      placeholder={meta?.valueLabel || t('ערך')} className={`${CONTROL} flex-1`} />
                    <Button variant="ghost" size="icon" className="h-9 w-8 text-destructive flex-shrink-0"
                      onClick={() => removeAt('actions', i)} aria-label={t('הסר פעולה')}
                      disabled={form.actions.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {/* Said before it is saved, not discovered after: without a
                        server this action is recorded, not delivered. */}
                    {meta?.requiresServer && !hasServer && (
                      <p className="basis-full inline-flex items-center gap-1 text-[11px] text-warning">
                        <Server className="w-3 h-3 flex-shrink-0" /> {t('נרשם ביומן המיילים בלבד — שליחה בפועל דורשת שרת')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Block>

          <section className="rounded-xl border border-dashed border-border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{t('בדיקה יבשה')}</p>
                <p className="text-[11px] text-muted-foreground">{t('על אילו רשומות הכלל היה פועל עכשיו — בלי לבצע דבר')}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs flex-shrink-0"
                onClick={runPreview} disabled={previewing}>
                {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                {t('בדוק')}
              </Button>
            </div>
            {preview && (
              <div className="text-xs">
                <p className="font-semibold">
                  {preview.length === 0 ? t('אף רשומה לא תואמת כרגע') : `${preview.length} ${t('רשומות תואמות')}`}
                </p>
                {preview.length > 0 && (
                  <ul className="mt-1 text-muted-foreground space-y-0.5">
                    {preview.slice(0, 5).map((r) => (
                      <li key={r.id} className="truncate">· {r.name || r.title || r.number || r.full_name || r.client_name || r.id}</li>
                    ))}
                    {preview.length > 5 && <li>+{preview.length - 5}</li>}
                  </ul>
                )}
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">{t('הפעלה')}</Label>
              <Picker value={form.run_mode} onChange={(v) => set({ run_mode: v })} options={RUN_MODES} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-background px-3 h-9">
              <Checkbox checked={!!form.active} onCheckedChange={(v) => set({ active: v === true })} disabled={readOnly} />
              <span className="text-sm">{t('הכלל פעיל')}</span>
            </label>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">{t('תיאור')}</Label>
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2}
              className="rounded-lg border-border bg-background text-sm" disabled={readOnly} />
          </div>
        </div>

        {!readOnly && (
          <div className="px-5 py-3 border-t border-border flex justify-start gap-2">
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('שמירה')}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('ביטול')}</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

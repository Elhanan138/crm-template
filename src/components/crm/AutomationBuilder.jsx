import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Plus, Trash2, Loader2, Save, Zap, Filter, PlayCircle } from 'lucide-react';
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

const Picker = ({ value, onChange, options, placeholder, className = '' }) => (
  <Select value={value === '' || value === undefined ? undefined : String(value)} onValueChange={onChange}>
    <SelectTrigger className={`${CONTROL} ${className}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent dir="rtl">
      {options.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

export default function AutomationBuilder({ open, onOpenChange, rule, onSave, saving, readOnly }) {
  const [form, setForm] = useState(() => ({ ...emptyRule, ...(rule || {}) }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

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
    if (!form.name.trim()) return toast.error('שם הכלל חובה');
    if ((event.needsField || event.needsDays) && event.needsField && !form.field) {
      return toast.error('בחר את השדה שהטריגר מתייחס אליו');
    }
    if (event.needsDays && !String(form.days).trim()) return toast.error('בחר מספר ימים');
    if (form.actions.length === 0) return toast.error('כלל בלי פעולה לא יעשה כלום');
    const badAction = form.actions.find((a) => {
      const meta = AUTOMATION_ACTIONS.find((m) => m.value === a.type);
      return meta?.needsField ? !a.field : !String(a.value ?? '').trim();
    });
    if (badAction) return toast.error('יש להשלים את פרטי כל הפעולות');
    onSave(form);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border text-right">
          <SheetTitle>{rule?.id ? 'עריכת כלל' : 'כלל חדש'}</SheetTitle>
          <SheetDescription>מתי הכלל רץ, על מה הוא מסתכל, ומה הוא עושה.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">שם הכלל <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} disabled={readOnly}
              placeholder="לדוגמה: ליד תקוע 7 ימים" className={CONTROL} />
          </div>

          <Block icon={Zap} title="מתי" hint="הישות והאירוע שמפעילים את הכלל">
            <div className="grid grid-cols-2 gap-2">
              <Picker value={form.subject} onChange={changeSubject} options={AUTOMATION_SUBJECTS} placeholder="ישות" />
              <Picker value={form.event} onChange={(v) => set({ event: v, field: '' })} options={AUTOMATION_EVENTS} placeholder="אירוע" />
              {event.needsField && (
                <Picker
                  value={form.field}
                  onChange={(v) => set({ field: v })}
                  options={form.event.startsWith('date_') ? dateFields : fieldOptions}
                  placeholder="שדה"
                />
              )}
              {event.needsDays && (
                <Input type="number" inputMode="numeric" dir="ltr" value={form.days}
                  onChange={(e) => set({ days: e.target.value })} placeholder="מספר ימים" className={CONTROL} />
              )}
            </div>
          </Block>

          <Block
            icon={Filter}
            title="תנאים"
            hint={form.conditions.length ? 'כל התנאים חייבים להתקיים' : 'ללא תנאים — הכלל ירוץ תמיד'}
            onAdd={readOnly ? undefined : () => set({ conditions: [...form.conditions, { field: '', op: 'eq', value: '' }] })}
            addLabel="תנאי"
          >
            {form.conditions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">אין תנאים</p>
            ) : (
              <div className="space-y-2">
                {form.conditions.map((cond, i) => {
                  const opMeta = CONDITION_OPERATORS.find((o) => o.value === cond.op);
                  const fieldMeta = subject.fields.find((f) => f.key === cond.field);
                  return (
                    <div key={i} className="flex gap-1.5 items-start">
                      <Picker value={cond.field} onChange={(v) => patchAt('conditions', i, { field: v, value: '' })}
                        options={fieldOptions} placeholder="שדה" className="flex-1" />
                      <Picker value={cond.op} onChange={(v) => patchAt('conditions', i, { op: v })}
                        options={CONDITION_OPERATORS} placeholder="תנאי" className="w-28 flex-shrink-0" />
                      {!opMeta?.noValue && (
                        fieldMeta?.options
                          ? <Picker value={cond.value} onChange={(v) => patchAt('conditions', i, { value: v })}
                              options={fieldMeta.options} placeholder="ערך" className="flex-1" />
                          : <Input value={cond.value} onChange={(e) => patchAt('conditions', i, { value: e.target.value })}
                              placeholder="ערך" className={`${CONTROL} flex-1`}
                              type={opMeta?.numeric || fieldMeta?.type === 'number' ? 'number' : 'text'} />
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-8 text-destructive flex-shrink-0"
                        onClick={() => removeAt('conditions', i)} aria-label="הסר תנאי">
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
            title="פעולות"
            hint="רצות לפי הסדר"
            onAdd={readOnly ? undefined : () => set({ actions: [...form.actions, { type: 'create_task', field: '', value: '' }] })}
            addLabel="פעולה"
          >
            <div className="space-y-2">
              {form.actions.map((action, i) => {
                const meta = AUTOMATION_ACTIONS.find((a) => a.value === action.type);
                return (
                  <div key={i} className="flex gap-1.5 items-start">
                    <Picker value={action.type} onChange={(v) => patchAt('actions', i, { type: v, field: '', value: '' })}
                      options={AUTOMATION_ACTIONS} placeholder="פעולה" className="flex-1" />
                    {meta?.needsField && (
                      <Picker value={action.field} onChange={(v) => patchAt('actions', i, { field: v })}
                        options={fieldOptions} placeholder="שדה" className="w-32 flex-shrink-0" />
                    )}
                    <Input value={action.value} onChange={(e) => patchAt('actions', i, { value: e.target.value })}
                      placeholder={meta?.valueLabel || 'ערך'} className={`${CONTROL} flex-1`} />
                    <Button variant="ghost" size="icon" className="h-9 w-8 text-destructive flex-shrink-0"
                      onClick={() => removeAt('actions', i)} aria-label="הסר פעולה"
                      disabled={form.actions.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </Block>

          <div className="grid grid-cols-2 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">הפעלה</Label>
              <Picker value={form.run_mode} onChange={(v) => set({ run_mode: v })} options={RUN_MODES} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-background px-3 h-9">
              <Checkbox checked={!!form.active} onCheckedChange={(v) => set({ active: v === true })} disabled={readOnly} />
              <span className="text-sm">הכלל פעיל</span>
            </label>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">תיאור</Label>
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2}
              className="rounded-lg border-border bg-background text-sm" disabled={readOnly} />
          </div>
        </div>

        {!readOnly && (
          <div className="px-5 py-3 border-t border-border flex justify-start gap-2">
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמירה
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

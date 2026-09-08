import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import RelatedRecords from '@/components/crm/RelatedRecords';
import { recordActionsFor } from '@/lib/crm/recordActions';
import PersonSelect from '@/components/shared/PersonSelect';
import DateField from '@/components/ui/date-field';
import { validateCustomFields } from '@/lib/customFields';

const CONTROL = 'h-9 rounded-lg border-border bg-background text-sm';

const NONE = '__none__';

const defaultsFor = (schema) =>
  Object.fromEntries(
    schema.fields
      .filter((f) => f.default !== undefined)
      .map((f) => [f.key, f.default])
  );

export default function CrmRecordSheet({
  open, onOpenChange, schema, record, relations, customFields = [], onSave, saving, readOnly, moduleId,
}) {
  const [form, setForm] = useState(() => ({ ...defaultsFor(schema), ...(record || {}) }));
  const [errors, setErrors] = useState({});
  const handOffs = recordActionsFor(moduleId, record);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const submit = () => {
    const next = {};
    for (const field of schema.fields) {
      if (!field.required) continue;
      const v = form[field.key];
      if (field.type === 'checkbox' ? v !== true : !String(v ?? '').trim()) {
        next[field.key] = 'שדה חובה';
      }
    }
    const missingCustom = validateCustomFields(customFields, form.custom_fields || {});
    if (Object.keys(next).length || missingCustom.length) {
      setErrors(next);
      toast.error(
        missingCustom.length
          ? `שדות חובה חסרים: ${missingCustom.join(', ')}`
          : 'יש למלא את שדות החובה'
      );
      return;
    }
    onSave(form);
  };

  const renderField = (field) => {
    const value = form[field.key] ?? (field.type === 'checkbox' ? false : '');
    const error = errors[field.key];
    const wide = field.type === 'textarea';

    if (field.type === 'checkbox') {
      return (
        <label
          key={field.key}
          className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-background px-3 h-9"
        >
          <Checkbox checked={!!value} disabled={readOnly} onCheckedChange={(v) => set(field.key, v === true)} />
          <span className="text-sm">{field.label}</span>
        </label>
      );
    }

    let control;
    if (field.type === 'person') {
      control = (
        <PersonSelect value={value} onChange={(v) => set(field.key, v)} by={field.by || 'email'} disabled={readOnly} />
      );
    } else if (field.type === 'date') {
      // Hebrew calendar picker, same control as the rest of the system.
      control = <DateField value={value} onChange={(v) => set(field.key, v)} disabled={readOnly} />;
    } else if (field.type === 'textarea') {
      control = (
        <Textarea
          value={value} rows={3} dir="rtl" disabled={readOnly}
          onChange={(e) => set(field.key, e.target.value)}
          className="rounded-lg border-border bg-background text-sm"
        />
      );
    } else if (field.type === 'select') {
      control = (
        <Select value={value === '' ? undefined : String(value)} disabled={readOnly}
          onValueChange={(v) => set(field.key, field.options.find((o) => String(o.value) === v)?.value ?? v)}>
          <SelectTrigger className={CONTROL}><SelectValue placeholder="בחר..." /></SelectTrigger>
          <SelectContent dir="rtl">
            {field.options.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    } else if (field.type === 'relation') {
      const items = relations?.[field.entity] || [];
      control = (
        <Select value={value === '' ? undefined : String(value)} disabled={readOnly}
          onValueChange={(v) => set(field.key, v === NONE ? '' : v)}>
          <SelectTrigger className={CONTROL}><SelectValue placeholder="בחר..." /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value={NONE}>ללא</SelectItem>
            {items.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r[field.labelField] || r.name || r.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else {
      const isNumeric = ['number', 'currency', 'percent'].includes(field.type);
      control = (
        <Input
          type={isNumeric ? 'number' : 'text'}
          inputMode={isNumeric ? 'decimal' : undefined}
          dir={isNumeric || ['email', 'phone', 'url'].includes(field.type) ? 'ltr' : 'rtl'}
          value={value} disabled={readOnly}
          onChange={(e) => set(field.key, e.target.value)}
          className={CONTROL}
        />
      );
    }

    return (
      <div key={field.key} className={`space-y-1 ${wide ? 'sm:col-span-2' : ''}`}>
        <Label className="text-xs font-medium text-muted-foreground">
          {field.label}{field.required && <span className="text-destructive"> *</span>}
        </Label>
        {control}
        {error
          ? <p className="text-[11px] text-destructive">{error}</p>
          : field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border text-right">
          <SheetTitle>
            {readOnly ? schema.singular : record?.id ? `עריכת ${schema.singular}` : `${schema.singular} חדש`}
          </SheetTitle>
          <SheetDescription>
            {readOnly ? 'אין לך הרשאת עריכה לרשומה הזו.' : schema.subtitle}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {schema.fields.map(renderField)}
          </div>

          {/* Hand-offs to another module — only those this build can serve. */}
          {record?.id && moduleId && handOffs.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">המשך תהליך</p>
              {handOffs.map((action) => (
                <div key={action.key} className="space-y-1">
                  <Button asChild variant="outline" size="sm" className="rounded-full h-8 px-3.5 text-xs gap-1.5">
                    <Link to={action.to(record)}>
                      <action.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {action.label}
                    </Link>
                  </Button>
                  {action.hint && <p className="text-[10px] text-muted-foreground">{action.hint}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Links out to related records — never merged into this form. */}
          {record?.id && moduleId && <RelatedRecords moduleId={moduleId} record={record} />}

          {customFields.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">שדות נוספים</p>
              <CustomFieldsRenderer
                fields={customFields}
                values={form.custom_fields || {}}
                onChange={(v) => set('custom_fields', v)}
              />
            </div>
          )}
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

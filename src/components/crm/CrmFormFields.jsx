import React from 'react';
import { Input } from '@/components/ui/input';
import Field from '@/components/shared/Field';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PersonSelect from '@/components/shared/PersonSelect';
import DateField from '@/components/ui/date-field';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import { readField, isDerived } from '@/lib/crm/derived';
import { formatValue } from '@/lib/crm/useCrmRecords';
import { useI18n } from '@/lib/i18n';
import { LINE_FIELD } from '@/lib/crm/lineItems';

// ─────────────────────────────────────────────────────────────────────────────
// The fields of a schema-driven form.
//
// Extracted so that the record sheet and the layout preview render THE SAME
// code. A preview drawn separately drifts from the form the day either one
// changes, and then it is answering the wrong question.
//
// `wrap` is how the preview gets its grip and its drop targets: it receives
// each item and the node for it, and returns whatever it wants around it. The
// real form passes nothing and gets the plain fields.
// ─────────────────────────────────────────────────────────────────────────────

// DESIGN_SYSTEM §7: h-10 in a full form. This one lives in a Sheet.
const CONTROL = 'h-10 rounded-lg border-border bg-background text-sm';
const NONE = '__none__';

export default function CrmFormFields({
  schema, layout, form, set, errors = {}, relations, readOnly, lineSource, wrap,
}) {
  const { t } = useI18n();

  const renderField = (field) => {
    // A derived field has no input: it is the answer to the other fields, and it
    // updates the moment they do. Showing it as a disabled box would invite
    // someone to try to "fix" a number that is not stored anywhere.
    if (isDerived(field)) {
      const derivedValue = readField(field, form);
      const meta = field.options?.find((o) => String(o.value) === String(derivedValue));
      return (
        <Field label={field.label} help={t('מחושב אוטומטית')}>
          <div className="h-10 flex items-center px-3 rounded-lg border border-dashed border-border bg-muted/30 text-sm">
            {meta ? (
              <span className="text-xs font-semibold">{meta.label}</span>
            ) : (
              <span dir={['currency', 'number', 'percent'].includes(field.type) ? 'ltr' : undefined}>
                {formatValue(field, derivedValue)}
              </span>
            )}
          </div>
        </Field>
      );
    }

    const value = form[field.key] ?? (field.type === 'checkbox' ? false : '');
    const error = errors[field.key];
    // Once there are lines, the total is theirs to state.
    const ownedByLines = lineSource && field.key === lineSource.totalField
      && (form[LINE_FIELD] || []).length > 0;

    if (field.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-background px-3 h-10">
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
          value={value} rows={3} disabled={readOnly}
          onChange={(e) => set(field.key, e.target.value)}
          className="rounded-lg border-border bg-background resize-none text-sm"
        />
      );
    } else if (field.type === 'select') {
      control = (
        <Select value={value === '' ? undefined : String(value)} disabled={readOnly}
          onValueChange={(v) => set(field.key, field.options.find((o) => String(o.value) === v)?.value ?? v)}>
          <SelectTrigger className={CONTROL}><SelectValue placeholder="בחר..." /></SelectTrigger>
          <SelectContent>
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
          <SelectContent>
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
      <Field
        label={field.label}
        required={field.required}
        error={error}
        help={ownedByLines ? t('מחושב מהשורות') : field.help}
      >
        {ownedByLines ? (
          <div className="h-10 flex items-center px-3 rounded-lg border border-dashed border-border bg-muted/30 text-sm">
            <span dir="ltr">{formatValue(field, value)}</span>
          </div>
        ) : control}
      </Field>
    );
  };

  // A custom field is rendered exactly like a declared one, with no heading and
  // no section of its own — it is a question on the form, not an appendix.
  const renderCustom = (field) => (
    <CustomFieldsRenderer
      fields={[field]}
      values={form.custom_fields || {}}
      onChange={(v) => set('custom_fields', { ...(form.custom_fields || {}), ...v })}
      columns={1}
    />
  );

  return layout.map((item, index) => {
    const wide = item.field.type === 'textarea';
    const node = item.kind === 'builtin' ? renderField(item.field) : renderCustom(item.field);
    if (wrap) return wrap({ item, index, wide, node });
    return (
      <div key={item.key} className={wide ? 'sm:col-span-2' : ''}>{node}</div>
    );
  });
}

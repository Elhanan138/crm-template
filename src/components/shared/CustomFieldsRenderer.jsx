import React from 'react';
import { Input } from '@/components/ui/input';
import Field from '@/components/shared/Field';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sortFields, visibleFields, pruneHiddenValues } from '@/lib/customFields';
import PersonSelect from '@/components/shared/PersonSelect';
import DateField from '@/components/ui/date-field';
import { PercentField, CurrencyField, RelativeDayNote, PersonAvatar } from '@/components/shared/fieldControls';

// DESIGN_SYSTEM §7: h-10 in a full form. A custom field is drawn exactly like a
// declared one — on the form it is another question, not an annex to it.
const INPUT_CLASS =
  'h-10 rounded-lg border-border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm';

/**
 * Renders the fields an administrator generated for an entity.
 * Values live in a single object keyed by field.key, stored on the record
 * as `custom_fields`, so adding a field never requires a schema change.
 */
export default function CustomFieldsRenderer({ fields, values = {}, onChange, columns = 2 }) {
  // A field with an unmet condition is not asked for at all, and the answer to
  // a question that has disappeared is dropped rather than saved as a fact
  // nobody stated.
  const all = sortFields(fields).filter((f) => !f.hidden);
  const list = visibleFields(all, values);
  if (all.length === 0) return null;

  const set = (key, value) => {
    const next = { ...values, [key]: value };
    onChange(pruneHiddenValues(all, next));
  };

  return (
    <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : ''} gap-3`}>
      {list.map((field) => {
        const value = values[field.key] ?? (field.type === 'checkbox' ? false : '');
        const wide = field.type === 'textarea';

        if (field.type === 'checkbox') {
          return (
            <label
              key={field.key}
              className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-background px-3 h-10"
            >
              <Checkbox checked={!!value} onCheckedChange={(v) => set(field.key, v === true)} />
              <span className="text-sm">{field.label}</span>
              {field.required && <span className="text-destructive text-xs">*</span>}
            </label>
          );
        }

        return (
          <Field
            key={field.key}
            label={field.label}
            required={field.required}
            help={field.help}
            className={wide ? 'sm:col-span-2' : ''}
          >

            {field.type === 'textarea' && (
              <Textarea
                value={value}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
                rows={3}
                className="rounded-lg border-border bg-background resize-none text-sm"
              />
            )}

            {field.type === 'person' && (
              <div className="flex items-center gap-2">
                <PersonAvatar name={value} />
                <div className="flex-1 min-w-0">
                  <PersonSelect value={value} onChange={(v) => set(field.key, v)} by={field.by || 'name'} />
                </div>
              </div>
            )}

            {field.type === 'date' && (
              <div className="space-y-1">
                <DateField value={value} onChange={(v) => set(field.key, v)} />
                <RelativeDayNote value={value} />
              </div>
            )}

            {field.type === 'percent' && (
              <PercentField
                value={value}
                onChange={(e) => set(field.key, e.target.value)}
                className={INPUT_CLASS}
              />
            )}

            {field.type === 'currency' && (
              <CurrencyField
                value={value}
                onChange={(e) => set(field.key, e.target.value)}
                className={INPUT_CLASS}
              />
            )}

            {field.type === 'select' && (
              <Select value={value || undefined} onValueChange={(v) => set(field.key, v)}>
                <SelectTrigger className={INPUT_CLASS}>
                  <SelectValue placeholder={field.placeholder || 'בחר...'} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {!['textarea', 'select', 'checkbox', 'person', 'date', 'percent', 'currency'].includes(field.type) && (
              <Input
                type={field.type === 'number' ? 'number' : 'text'}
                inputMode={field.type === 'number' ? 'numeric' : undefined}
                dir={['url', 'email', 'phone', 'number'].includes(field.type) ? 'ltr' : 'rtl'}
                value={value}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
                className={INPUT_CLASS}
              />
            )}

          </Field>
        );
      })}
    </div>
  );
}

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sortFields, visibleFields, pruneHiddenValues } from '@/lib/customFields';
import PersonSelect from '@/components/shared/PersonSelect';
import DateField from '@/components/ui/date-field';

const INPUT_CLASS =
  'h-9 rounded-lg border-border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm';

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
              className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-background px-3 h-9"
            >
              <Checkbox checked={!!value} onCheckedChange={(v) => set(field.key, v === true)} />
              <span className="text-sm">{field.label}</span>
              {field.required && <span className="text-destructive text-xs">*</span>}
            </label>
          );
        }

        return (
          <div key={field.key} className={`space-y-1 ${wide ? 'sm:col-span-2' : ''}`}>
            <Label className="text-xs font-medium text-muted-foreground">
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>

            {field.type === 'textarea' && (
              <Textarea
                value={value}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
                rows={3}
                className="rounded-lg border-border bg-background text-sm"
              />
            )}

            {field.type === 'person' && (
              <PersonSelect value={value} onChange={(v) => set(field.key, v)} by={field.by || 'name'} />
            )}

            {field.type === 'date' && (
              <DateField value={value} onChange={(v) => set(field.key, v)} />
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

            {!['textarea', 'select', 'checkbox', 'person', 'date'].includes(field.type) && (
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

            {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}

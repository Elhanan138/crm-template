import React, { useEffect, useRef, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateField from '@/components/ui/date-field';
import PersonSelect from '@/components/shared/PersonSelect';
import { useI18n } from '@/lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// INLINE EDITING
//
// Status, owner and a date are most of what anyone ever changes, and each of
// them cost a sheet: open, scroll, edit, save, close. Here the cell becomes the
// editor in place.
//
// What is NOT editable inline is deliberate: a derived value (there is nothing
// to type), a long text (it needs room), and anything on a record the viewer
// may not edit. Those fall through to the read-only cell, and the sheet remains
// the way to edit a record properly.
// ─────────────────────────────────────────────────────────────────────────────

const EDITABLE_TYPES = new Set([
  'select', 'person', 'date', 'text', 'number', 'currency', 'percent', 'email', 'phone', 'url',
]);

export const canEditInline = (field, editable) =>
  editable && !field?.derive && !field?.readOnly && EDITABLE_TYPES.has(field?.type);

/** A `select` with tones is committed on choice; everything else on blur/Enter. */
export default function InlineEditCell({ field, value, onCommit, onCancel, saving }) {
  const { dir } = useI18n();
  const [draft, setDraft] = useState(value ?? '');
  const wrapRef = useRef(null);

  // Escape always gets you out without saving — the single most important
  // property of an editor that opens where you clicked.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const commit = (next = draft) => {
    if (String(next ?? '') === String(value ?? '')) return onCancel();
    onCommit(next);
  };

  const stop = (e) => e.stopPropagation();

  if (saving) {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />;
  }

  if (field.type === 'select') {
    return (
      <div ref={wrapRef} onClick={stop}>
        <Select
          defaultOpen
          value={draft === '' ? undefined : String(draft)}
          onValueChange={(v) => commit(field.options?.find((o) => String(o.value) === v)?.value ?? v)}
          onOpenChange={(open) => { if (!open) onCancel(); }}
        >
          <SelectTrigger className="h-7 rounded-md text-xs"><SelectValue /></SelectTrigger>
          <SelectContent dir={dir}>
            {(field.options || []).map((o) => (
              <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'person') {
    return (
      <div ref={wrapRef} onClick={stop}>
        <PersonSelect value={draft} by={field.by || 'email'} onChange={(v) => commit(v)} />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div ref={wrapRef} onClick={stop}>
        <DateField value={draft} onChange={(v) => commit(v)} />
      </div>
    );
  }

  const numeric = ['number', 'currency', 'percent'].includes(field.type);
  return (
    <div ref={wrapRef} onClick={stop} className="flex items-center gap-1">
      <Input
        autoFocus
        type={numeric ? 'number' : 'text'}
        inputMode={numeric ? 'decimal' : undefined}
        dir={numeric || ['email', 'phone', 'url'].includes(field.type) ? 'ltr' : dir}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        onBlur={() => commit()}
        className="h-7 rounded-md text-xs px-2"
      />
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => commit()} className="text-success" aria-label="שמירה">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onCancel} className="text-muted-foreground" aria-label="ביטול">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import {
  GripVertical, RotateCcw, SlidersHorizontal, ChevronDown, Calendar, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { FIELD_TYPE_MAP, formFieldsOf } from '@/lib/customFields';
import { resolveLayout, moveInLayout, isCustomised } from '@/lib/formLayout';

// ─────────────────────────────────────────────────────────────────────────────
// FORM LAYOUT EDITOR
//
// The order a form asks its questions in is a decision about how the work
// reads, and it belongs to whoever runs the deployment. Everything here moves:
// built-in fields and custom ones, in one list, in any order.
//
// What is shown is the form itself — the same labels, the same controls, the
// same two-column shape — because a preview that looks like a settings list
// cannot answer the only question being asked of it: what will this look like.
// The controls are inert on purpose; this is a picture, not a form.
//
// Drag and drop is the browser's own (draggable + dataTransfer). A library for
// this would be a dependency for one screen.
// ─────────────────────────────────────────────────────────────────────────────

const WIDE_TYPES = new Set(['textarea', 'checklist']);

/** A control drawn to look like the real one, without being one. */
function GhostControl({ field, kind }) {
  const { t } = useI18n();
  const type = field.type || 'text';
  const hint = field.placeholder ? t(field.placeholder) : '';

  if (type === 'checkbox') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-9">
        <span className="w-4 h-4 rounded-sm border border-input flex-shrink-0" />
        <span className="text-sm text-muted-foreground truncate">{t(field.label)}</span>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className="rounded-lg border border-border bg-background h-16 px-3 py-2">
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    );
  }

  const trailing =
    type === 'select' || type === 'relation' || type === 'person' ? ChevronDown
      : type === 'date' ? Calendar
        : null;
  const Trailing = trailing;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background h-9 px-3">
      <span className="flex-1 text-xs text-muted-foreground truncate">{hint}</span>
      {Trailing && <Trailing className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      {kind === 'custom' && !Trailing && (
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          {t(FIELD_TYPE_MAP[type]?.label || '')}
        </span>
      )}
    </div>
  );
}

// The gap between two fields. It stays invisible until something is being
// dragged, then opens into a target big enough to actually hit.
function DropGap({ active, dragging, wide, onDragOver, onDragLeave, onDrop, label }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label={label}
      className={`${wide ? 'sm:col-span-2' : ''} rounded-lg transition-all ${
        !dragging ? 'h-0'
          : active ? 'h-9 border-2 border-primary bg-accent'
            : 'h-9 border-2 border-dashed border-border/70'
      }`}
    />
  );
}

export default function FormLayoutEditor({ entity, fields, order, onReorder, onReset, busy }) {
  const { t } = useI18n();
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  const items = useMemo(
    () => resolveLayout(entity, fields, order),
    [entity, fields, order],
  );
  const customised = isCustomised(entity, fields, order);

  if (formFieldsOf(entity).length === 0 && items.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border px-3 py-4 text-center">
        {t('אין תיאור טופס לישות הזו, כך שאין מה לסדר.')}
      </p>
    );
  }

  const drop = (gapIndex) => (event) => {
    event.preventDefault();
    setOver(null);
    // The key travels in the dataTransfer, which is what it is for. Reading it
    // from React state would depend on a re-render having happened between
    // picking a field up and letting go of it.
    const key = event.dataTransfer?.getData('text/plain') || dragging;
    setDragging(null);
    if (!key) return;
    const next = moveInLayout(items, key, gapIndex);
    if (next.join('|') !== items.map((i) => i.key).join('|')) onReorder(next);
  };

  const allowDrop = (gapIndex) => (event) => {
    // Without preventDefault the browser refuses the drop entirely.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setOver(gapIndex);
  };

  const gap = (index, wide) => (
    <DropGap
      key={`gap-${index}`}
      wide={wide}
      active={over === index && !!dragging}
      dragging={!!dragging}
      onDragOver={allowDrop(index)}
      onDragLeave={() => setOver(null)}
      onDrop={drop(index)}
      label={`${t('מיקום')} ${index + 1}`}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{t('סדר הטופס')}</p>
          <p className="text-[11px] text-muted-foreground">
            {t('גררו כל שדה למקום שבו הוא צריך להופיע. כך בדיוק ייראה הטופס.')}
          </p>
        </div>
        {customised && (
          <Button
            variant="ghost" size="sm" className="h-7 gap-1.5 text-xs flex-shrink-0"
            onClick={onReset} disabled={busy}
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t('סדר מקורי')}
          </Button>
        )}
      </div>

      {/* The same two-column shape the real form uses. */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 max-h-[30rem] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
          {gap(0, true)}
          {items.map((item, index) => {
            const wide = WIDE_TYPES.has(item.field.type);
            const Icon = item.kind === 'custom'
              ? (FIELD_TYPE_MAP[item.field.type]?.icon || SlidersHorizontal)
              : null;
            return (
              <React.Fragment key={item.key}>
                <div
                  draggable={!busy}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', item.key);
                    event.dataTransfer.effectAllowed = 'move';
                    setDragging(item.key);
                  }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                  className={`group space-y-1 rounded-lg p-2 -m-0.5 cursor-grab active:cursor-grabbing transition-colors ${
                    wide ? 'sm:col-span-2' : ''
                  } ${dragging === item.key ? 'opacity-40' : 'hover:bg-card'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {t(item.field.label)}
                      {item.field.required && <span className="text-destructive"> *</span>}
                    </span>
                    {Icon && (
                      <span
                        title={t('שדה מותאם')}
                        className="ms-auto flex items-center gap-1 rounded-full bg-accent text-primary px-1.5 py-0.5 text-[9px] font-semibold flex-shrink-0"
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {t('מותאם')}
                      </span>
                    )}
                  </div>
                  <GhostControl field={item.field} kind={item.kind} />
                </div>
                {gap(index + 1, wide)}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Check className="w-3 h-3 flex-shrink-0" />
        {t('הסדר נשמר מיד ומשפיע על הטופס עצמו — יצירה ועריכה כאחד.')}
      </p>
    </div>
  );
}

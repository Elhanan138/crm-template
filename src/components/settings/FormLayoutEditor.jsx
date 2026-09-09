import React, { useMemo, useState } from 'react';
import { GripVertical, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { formFieldsOf } from '@/lib/customFields';
import { resolveLayout, moveInLayout, isCustomised } from '@/lib/formLayout';
import FormPreview from '@/components/settings/FormPreview';

// ─────────────────────────────────────────────────────────────────────────────
// FORM LAYOUT EDITOR
//
// The order a form asks its questions in is a decision about how the work
// reads, and it belongs to whoever runs the deployment. Everything moves:
// declared fields and custom ones, in one list, in any order. Nothing is
// pinned, and a custom field is not marked out as different — on the form it is
// simply another question.
//
// What is shown is the REAL form (see FormPreview), with a grip and a drop
// target laid over each field. The controls underneath are inert: pointer
// events are off inside each field and on again on the wrapper, so a drag is
// picked up but a select never opens.
//
// Drag and drop is the browser's own (draggable + dataTransfer). A library for
// this would be a dependency for one screen.
// ─────────────────────────────────────────────────────────────────────────────

// The gap between two fields. Invisible until something is being dragged, then
// open enough to actually hit.
function DropGap({ active, dragging, wide, onDragOver, onDragLeave, onDrop, label }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label={label}
      className={`${wide ? 'sm:col-span-2' : ''} rounded-lg transition-all ${
        !dragging ? 'h-0'
          : active ? 'h-10 border-2 border-primary bg-accent'
            : 'h-10 border-2 border-dashed border-border/70'
      }`}
    />
  );
}

export default function FormLayoutEditor({ entity, fields, order, onReorder, onReset, busy }) {
  const { t } = useI18n();
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  const items = useMemo(() => resolveLayout(entity, fields, order), [entity, fields, order]);
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

  const gap = (index, wide, key) => (
    <DropGap
      key={key}
      wide={wide}
      active={over === index && !!dragging}
      dragging={!!dragging}
      onDragOver={allowDrop(index)}
      onDragLeave={() => setOver(null)}
      onDrop={drop(index)}
      label={`${t('מיקום')} ${index + 1}`}
    />
  );

  // Each field of the real form, with a grip over it and a gap after it.
  const wrap = ({ item, index, wide, node }) => (
    <React.Fragment key={item.key}>
      {index === 0 && gap(0, true, 'gap-0')}
      <div
        draggable={!busy}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', item.key);
          event.dataTransfer.effectAllowed = 'move';
          setDragging(item.key);
        }}
        onDragEnd={() => { setDragging(null); setOver(null); }}
        className={`group relative rounded-lg cursor-grab active:cursor-grabbing transition-colors ${
          wide ? 'sm:col-span-2' : ''
        } ${dragging === item.key ? 'opacity-40' : 'hover:bg-muted/40'}`}
      >
        {/* The form itself, made inert: it is here to be looked at. */}
        <div className="pointer-events-none select-none p-1.5">{node}</div>
        <GripVertical
          className="absolute top-1.5 end-1 w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors"
          aria-hidden="true"
        />
      </div>
      {gap(index + 1, wide, `gap-${index + 1}`)}
    </React.Fragment>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{t('סדר הטופס')}</p>
          <p className="text-[11px] text-muted-foreground">
            {t('גררו כל שדה למקום שבו הוא צריך להופיע. זה הטופס עצמו, לא הדמיה שלו.')}
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
      <div className="rounded-xl border border-border bg-card p-3 max-h-[32rem] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
          <FormPreview entity={entity} layout={items} customFields={fields} wrap={wrap} />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Check className="w-3 h-3 flex-shrink-0" />
        {t('הסדר נשמר מיד ומשפיע על הטופס עצמו — יצירה ועריכה כאחד.')}
      </p>
    </div>
  );
}

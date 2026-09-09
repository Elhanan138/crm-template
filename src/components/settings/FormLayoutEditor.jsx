import React, { useMemo, useState } from 'react';
import { GripVertical, Lock, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  FIELD_TYPE_MAP, LAYOUT_START, LAYOUT_END, layoutSlots, placeField, formFieldsOf,
} from '@/lib/customFields';

// ─────────────────────────────────────────────────────────────────────────────
// FORM LAYOUT EDITOR
//
// Custom fields used to land in a block at the foot of the form, always, and an
// administrator who wanted a field beside the amount had no way to say so. This
// shows the real form — the built-in fields in schema order — and lets a custom
// field be dragged to any position between them.
//
// The built-in fields are shown but not movable: they are the schema, and the
// schema is one description of what a record is, not a layout to be shuffled.
// What is stored is only where each custom field sits.
//
// Drag and drop is the browser's own (draggable + dataTransfer). A library for
// this would be a dependency for one screen.
// ─────────────────────────────────────────────────────────────────────────────

// A two-pixel gap is not a drop target anyone can hit. The lines open up to a
// real target while something is being dragged, and collapse again after.
function DropLine({ active, dragging, onDragOver, onDragLeave, onDrop, label }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label={label}
      className={`rounded-lg transition-all ${
        !dragging ? 'h-1'
          : active ? 'h-7 border-2 border-primary bg-accent'
            : 'h-7 border-2 border-dashed border-border'
      }`}
    />
  );
}

export default function FormLayoutEditor({ entity, fields, onPlace, busy }) {
  const { t } = useI18n();
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  const formFields = useMemo(() => formFieldsOf(entity), [entity]);
  const slots = useMemo(() => layoutSlots(formFields, fields), [formFields, fields]);


  // The id travels in the dataTransfer, which is what it is for. Reading it
  // from React state instead would depend on a re-render having happened
  // between picking a field up and letting go of it.
  const drop = (after) => (event) => {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer?.getData('text/plain') || dragging;
    setDragging(null);
    if (!id) return;
    const changes = placeField(fields, id, after);
    if (changes.length) onPlace(changes);
  };

  const allowDrop = (key) => (event) => {
    // Without preventDefault the browser refuses the drop entirely.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setOver(key);
  };

  const CustomChip = ({ field }) => {
    const Icon = FIELD_TYPE_MAP[field.type]?.icon || SlidersHorizontal;
    return (
      <div
        draggable={!busy}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', field.id);
          event.dataTransfer.effectAllowed = 'move';
          setDragging(field.id);
        }}
        onDragEnd={() => { setDragging(null); setOver(null); }}
        className={`flex items-center gap-2 rounded-lg border border-primary/40 bg-accent px-2.5 py-1.5 cursor-grab active:cursor-grabbing ${
          dragging === field.id ? 'opacity-40' : ''
        }`}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-medium truncate">{field.label}</span>
        {field.required && <span className="text-destructive text-xs">*</span>}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{t('מיקום בטופס')}</p>
        <p className="text-[11px] text-muted-foreground">
          {t('גררו שדה מותאם למקום שבו הוא צריך להופיע בטופס. השדות המובנים קבועים.')}
        </p>
      </div>

      {formFields.length === 0 ? (
        <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border px-3 py-4 text-center">
          {t('אין תיאור טופס לישות הזו, כך שאין מיקומים לבחור מהם. השדות יופיעו בסוף הטופס.')}
        </p>
      ) : (
      <div className="rounded-lg border border-border p-2 space-y-1 max-h-[26rem] overflow-y-auto">
        {/* Each slot renders what is in it, then the line that means "drop here
            to sit after this". The first slot has no field of its own, so its
            line is the top of the form. */}
        {slots.map((slot) => (
          <div key={slot.key} className="space-y-1">
            {slot.field && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{t(slot.field.label)}</span>
              </div>
            )}

            {slot.custom.length > 0 && (
              <div className="space-y-1 ms-4">
                {slot.custom.map((field) => <CustomChip key={field.id} field={field} />)}
              </div>
            )}

            <DropLine
              active={over === slot.key && !!dragging}
              dragging={!!dragging}
              onDragOver={allowDrop(slot.key)}
              onDragLeave={() => setOver(null)}
              onDrop={drop(slot.key)}
              label={slot.field
                ? `${t('מיקום אחרי')} ${slot.field.label}`
                : slot.key === LAYOUT_START ? t('מיקום בתחילת הטופס') : t('מיקום בסוף הטופס')}
            />
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-3">
            {t('אין עדיין שדות מותאמים לישות הזו')}
          </p>
        )}
      </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {t('שדה שלא הוזז מופיע בסוף הטופס, כמו קודם.')}
      </p>
    </div>
  );
}

export { LAYOUT_START, LAYOUT_END };

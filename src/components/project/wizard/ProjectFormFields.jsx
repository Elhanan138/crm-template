import React from 'react';
import { Input } from '@/components/ui/input';
import { ImagePlus, Loader2, X } from 'lucide-react';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import Field from '@/components/shared/Field';

// ─────────────────────────────────────────────────────────────────────────────
// The fields of the project form.
//
// Extracted so that the wizard step and the layout preview render THE SAME
// code — a preview drawn separately drifts the day either one changes.
// ─────────────────────────────────────────────────────────────────────────────

// DESIGN_SYSTEM §7: h-10 in a full form.
const CONTROL = 'h-10 rounded-lg border-border bg-background text-sm';

// Blocks that need the full width of the two-column grid.
const WIDE = new Set(['client_name']);

export default function ProjectFormFields({
  form, updateField, layout, customFields = [], uploadingImage, handleImageUpload, wrap,
}) {
  const setCustom = (v) => updateField('custom_fields', { ...(form.custom_fields || {}), ...v });

  const blocks = {
    client_name: (
      <Field label="שם הלקוח" required>
        <div className="flex items-center gap-2.5">
          {form.image_url ? (
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border flex-shrink-0 group">
              <img src={form.image_url} alt="תמונת פרויקט" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => updateField('image_url', '')}
                aria-label="הסרת התמונה"
                className="absolute top-0.5 start-0.5 w-4 h-4 rounded-full bg-foreground/60 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <label className="w-10 h-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors flex-shrink-0">
              {uploadingImage
                ? <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                : <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          )}
          <Input
            value={form.client_name}
            onChange={(e) => updateField('client_name', e.target.value)}
            placeholder="שם החברה / הגוף"
            className={`${CONTROL} flex-1`}
          />
        </div>
      </Field>
    ),
    contract_value: (
      <Field label="שווי חוזה (₪)">
        <Input
          type="number"
          inputMode="numeric"
          dir="ltr"
          value={form.contract_value}
          onChange={(e) => updateField('contract_value', e.target.value)}
          placeholder="0"
          className={CONTROL}
        />
      </Field>
    ),
    ...Object.fromEntries(customFields.map((field) => [field.key, (
      <CustomFieldsRenderer fields={[field]} values={form.custom_fields || {}} onChange={setCustom} columns={1} />
    )])),
  };

  return layout.map((item, index) => {
    const node = blocks[item.key];
    if (!node) return null;
    const wide = WIDE.has(item.key) || item.field?.type === 'textarea';
    if (wrap) return wrap({ item, index, wide, node });
    return <div key={item.key} className={wide ? 'sm:col-span-2' : ''}>{node}</div>;
  });
}

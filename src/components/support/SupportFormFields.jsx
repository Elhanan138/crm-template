import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImagePlus, Loader2, X } from 'lucide-react';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import Field from '@/components/shared/Field';
import SegmentedField from '@/components/shared/SegmentedField';

// ─────────────────────────────────────────────────────────────────────────────
// The fields of the support form.
//
// Extracted so that the form and the layout preview render THE SAME code — a
// preview drawn separately drifts the day either one changes.
// ─────────────────────────────────────────────────────────────────────────────

const URGENCY = [
  { key: 'low', label: 'נמוכה', dot: 'bg-muted-foreground/40', active: 'bg-muted text-foreground' },
  { key: 'medium', label: 'בינונית', dot: 'bg-warning', active: 'bg-warning-muted text-warning' },
  { key: 'high', label: 'גבוהה / חוסם', dot: 'bg-destructive', active: 'bg-destructive/10 text-destructive' },
];

export { URGENCY };

export default function SupportFormFields({
  form, setForm, layout, customFields = [], compact, uploading,
  handlePaste, handleImageUpload, removeImage, wrap,
}) {
  const setCustom = (v) => setForm(f => ({ ...f, custom_fields: { ...(f.custom_fields || {}), ...v } }));

  // One entry per block this form can render.
  const blocks = {
    urgency: (
          <Field label="דחיפות">
            <SegmentedField
              value={form.priority}
              onChange={v => setForm(f => ({ ...f, priority: v }))}
              options={URGENCY}
              idOf={o => o.key}
              ariaLabel="דחיפות"
            />
          </Field>
    ),
    title: (
          <Field label="כותרת" htmlFor="sf-title" required>
            <Input
              id="sf-title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="תאר בקצרה את הנושא..."
              maxLength={120}
              className="h-10"
            />
          </Field>
    ),
    description: (
          <Field label="תיאור מפורט" htmlFor="sf-desc" required>
            <div className="relative">
              <Textarea
                id="sf-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                onPaste={handlePaste}
                rows={compact ? 4 : 6}
                placeholder="פרט כמה שיותר — מה קורה, מה ציפית שיקרה, וצעדים לשחזור... (ניתן להדביק צילומי מסך ישירות)"
                className="resize-none text-sm pb-6"
              />
              <span className="absolute bottom-2 start-3 text-[11px] text-muted-foreground pointer-events-none">
                {form.description.length} תווים
              </span>
            </div>
          </Field>
    ),
    image_urls: (
          <Field label="צילומי מסך" help="אופציונלי — תמונה שווה אלף מילים">
            <label className={`flex flex-col items-center justify-center gap-1.5 py-5 px-4 rounded-lg border border-dashed cursor-pointer transition-all ${
              uploading ? 'border-input bg-muted/40 cursor-wait' : 'border-input bg-muted/20 hover:border-ring/50 hover:bg-accent/30'
            }`}>
              {uploading
                ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
              <span className="text-xs font-medium text-muted-foreground">
                {uploading ? 'מעלה...' : 'לחץ לצירוף צילומי מסך'}
              </span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
            {(form.image_urls || []).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.image_urls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border group">
                    <img src={url} alt={`צרופה ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label="הסרת תמונה"
                      className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full bg-foreground/60 text-background flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
    ),
    ...Object.fromEntries(customFields.map(field => [field.key, (
      <CustomFieldsRenderer fields={[field]} values={form.custom_fields || {}} onChange={setCustom} columns={1} />
    )])),
  };

  return layout.map((item, index) => {
    const node = blocks[item.key];
    if (!node) return null;
    if (wrap) return wrap({ item, index, wide: true, node });
    return <React.Fragment key={item.key}>{node}</React.Fragment>;
  });
}

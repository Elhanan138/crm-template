import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, Loader2, X } from 'lucide-react';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';

// ─────────────────────────────────────────────────────────────────────────────
// The fields of the project form.
//
// Extracted so that the wizard step and the layout preview render THE SAME
// code — a preview drawn separately drifts the day either one changes.
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectFormFields({
 form, updateField, layout, customFields = [], uploadingImage, handleImageUpload, wrap,
}) {
 const setCustom = (v) => updateField('custom_fields', { ...(form.custom_fields || {}), ...v });

 // One entry per block this form can render.
 const blocks = {
  client_name: (
   <div className="sm:col-span-2">
   <div className="sm:col-span-2 flex items-center gap-2.5">
        {form.image_url ? (
         <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0 group">
          <img src={form.image_url} alt="תמונת פרויקט"className="w-full h-full object-cover"/>
          <button type="button"onClick={() => updateField('image_url', '')} className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <X className="w-2.5 h-2.5"/>
          </button>
         </div>
        ) : (
         <label className="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors flex-shrink-0">
          {uploadingImage ? <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin"/> : <ImagePlus className="w-3.5 h-3.5 text-muted-foreground"/>}
          <input type="file"accept="image/*"onChange={handleImageUpload} className="hidden"disabled={uploadingImage} />
         </label>
        )}
        <div className="flex-1 space-y-1">
         <Label className="text-xs font-medium text-muted-foreground">שם הלקוח <span className="text-destructive">*</span></Label>
         <Input value={form.client_name} onChange={(e) => updateField('client_name', e.target.value)} placeholder="שם החברה / הגוף"className="h-9 rounded-lg border-border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"/>
        </div>
       </div>
   </div>
  ),
  contract_value: (
   <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">שווי חוזה (₪)</Label>
        <Input type="number"inputMode="numeric"value={form.contract_value} onChange={(e) => updateField('contract_value', e.target.value)} placeholder="0"className="h-9 rounded-lg border-border bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"/>
       </div>
  ),
  ...Object.fromEntries(customFields.map(field => [field.key, (
   <div className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
    <CustomFieldsRenderer fields={[field]} values={form.custom_fields || {}} onChange={setCustom} columns={1} />
   </div>
  )])),
 };

 return layout.map((item, index) => {
  const node = blocks[item.key];
  if (!node) return null;
  const wide = item.key === 'client_name' || item.field?.type === 'textarea';
  if (wrap) return wrap({ item, index, wide, node });
  return <React.Fragment key={item.key}>{node}</React.Fragment>;
 });
}

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, ImagePlus, Loader2, X } from 'lucide-react';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import { useFormLayout } from '@/lib/useFormLayout';

export default function Step1General({ form, updateField, people, uploadingImage, handleImageUpload, customFields = [] }) {
 // The order this form asks its questions in, set in
 // הגדרות → שדות מותאמים. Every block is addressable by key.
 const layout = useFormLayout('Project', customFields);
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

 return (
  <Card className="border-border shadow-sm">
   <CardContent className="p-4 space-y-3">
    <div className="flex items-center gap-2.5">
     <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
      <FileText className="w-3.5 h-3.5 text-primary"/>
     </div>
     <div>
      <h3 className="text-sm font-bold text-foreground">פרטים כלליים</h3>
      <p className="text-xs text-muted-foreground">מידע בסיסי על הפרויקט והלקוח</p>
     </div>
    </div>

    {/* Each block is addressable by key, so the order set in
        הגדרות → שדות מותאמים can rearrange them — built-in blocks too. */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     {layout.map(item => (
      <React.Fragment key={item.key}>{blocks[item.key] || null}</React.Fragment>
     ))}
    </div>
   </CardContent>
  </Card>
 );
}

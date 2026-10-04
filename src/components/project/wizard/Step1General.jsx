import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { useFormLayout } from '@/lib/useFormLayout';
import ProjectFormFields from '@/components/project/wizard/ProjectFormFields';

export default function Step1General({ form, updateField, people, uploadingImage, handleImageUpload, customFields = [] }) {
 // The order this form asks its questions in, set in
 // הגדרות → שדות מותאמים. Every block is addressable by key.
 const layout = useFormLayout('Project', customFields);
 const setCustom = (v) => updateField('custom_fields', { ...(form.custom_fields || {}), ...v });

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

    {/* The same renderer the layout preview uses. */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <ProjectFormFields
      form={form}
      updateField={updateField}
      layout={layout}
      customFields={customFields}
      uploadingImage={uploadingImage}
      handleImageUpload={handleImageUpload}
     />
    </div>
   </CardContent>
  </Card>
 );
}

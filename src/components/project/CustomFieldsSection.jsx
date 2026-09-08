import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { Plus, Pencil, Trash2, Loader2, Type, Hash, Calendar, ListChecks, X, SlidersHorizontal, Lock } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/formatDate';
import DateField from '@/components/ui/date-field';
import { toast } from 'sonner';

function getErrorMessage(err) {
 const msg = err?.response?.data?.error || err?.message || '';
 if (err?.response?.status === 403 || err?.status === 403 || msg.includes('הרשאה')) return 'אין לך הרשאה לערוך שדות בפרויקט זה';
 if (msg) return msg;
 return 'שגיאה בשמירת השדה';
}

const TYPE_CONFIG = {
 text:  { label: 'טקסט', icon: Type },
 number: { label: 'מספר', icon: Hash },
 date:  { label: 'תאריך', icon: Calendar },
 select: { label: 'רשימת בחירה', icon: ListChecks },
};

function formatValue(field) {
 if (field.value === undefined || field.value === null || field.value === '') return null;
 if (field.field_type === 'date') {
  const d = new Date(field.value);
  return isNaN(d) ? field.value : formatDate(d, 'full');
 }
 if (field.field_type === 'number') {
  const n = Number(field.value);
  return isNaN(n) ? field.value : n.toLocaleString();
 }
 return field.value;
}

function CustomFieldForm({ field, projectId, onClose }) {
 const queryClient = useQueryClient();
 const [form, setForm] = useState({
  label: field?.label || '',
  field_type: field?.field_type || 'text',
  options: field?.options || [],
  value: field?.value || '',
 });
 const [optionInput, setOptionInput] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const submittedRef = useRef(false);

 // Reset form state whenever the dialog opens (field prop changes or component mounts)
 useEffect(() => {
  setForm({
   label: field?.label || '',
   field_type: field?.field_type || 'text',
   options: field?.options || [],
   value: field?.value || '',
  });
  setOptionInput('');
  setIsSubmitting(false);
  submittedRef.current = false;
 }, [field]);

 const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

 const addOption = () => {
  const o = optionInput.trim();
  if (o && !form.options.includes(o)) {
   update('options', [...form.options, o]);
   setOptionInput('');
  }
 };
 const removeOption = (o) => update('options', form.options.filter(x => x !== o));

 const createMutation = useMutation({
  mutationFn: (data) => api.functions.invoke('manageCustomField', { action: 'create', project_ref: projectId, field: data }),
 });
 const updateMutation = useMutation({
  mutationFn: (data) => api.functions.invoke('manageCustomField', { action: 'update', project_ref: projectId, field_id: field.id, field: data }),
 });

 const handleSubmit = async () => {
  // Guard: prevent double-submission or submission with empty label
  if (submittedRef.current || isSubmitting) return;
  if (!form.label.trim()) { toast.error('שם השדה חובה'); return; }
  if (form.field_type === 'select' && (!form.options || form.options.length === 0)) { toast.error('שדה מסוג רשימת בחירה חייב לכלול לפחות אפשרות אחת'); return; }

  submittedRef.current = true;
  setIsSubmitting(true);
  const data = { ...form };
  try {
   if (field) await updateMutation.mutateAsync(data);
   else await createMutation.mutateAsync(data);
   queryClient.invalidateQueries({ queryKey: ['customFields', projectId] });
   toast.success(field ? 'שדה עודכן' : 'שדה נוסף');
   onClose();
  } catch (err) {
   // Re-allow submission on failure
   submittedRef.current = false;
   setIsSubmitting(false);
   const msg = getErrorMessage(err);
   toast.error(msg);
   console.error('[CustomField save]', err);
  }
 };

 const busy = isSubmitting || createMutation.isPending || updateMutation.isPending;

 return (
  <div className="space-y-4"dir="rtl">
   <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground text-right">שם השדה *</Label>
    <Input value={form.label} onChange={e => update('label', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="לדוגמה: מספר פרויקט, איש קשר טכני..."className="h-10 rounded-lg text-sm"dir="rtl"autoFocus />
   </div>

   <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground text-right">סוג השדה</Label>
    <div className="grid grid-cols-2 gap-2">
     {Object.entries(TYPE_CONFIG).map(([k, cfg]) => {
      const Icon = cfg.icon;
      const active = form.field_type === k;
      return (
       <button
        key={k}
        type="button"
        onClick={() => update('field_type', k)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${active ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/20'}`}
       >
        <Icon className="w-4 h-4 flex-shrink-0"/>
        {cfg.label}
       </button>
      );
     })}
    </div>
   </div>

   {form.field_type === 'select' && (
    <div className="space-y-1.5">
     <Label className="text-xs font-medium text-muted-foreground text-right">אפשרויות בחירה</Label>
     <div className="flex gap-2">
      <Input
       value={optionInput}
       onChange={e => setOptionInput(e.target.value)}
       onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
       placeholder="הוסף אפשרות ולחץ Enter"
       className="h-9 rounded-lg text-sm flex-1"
       dir="rtl"
      />
      <Button type="button"variant="outline"onClick={addOption} className="rounded-lg h-9 px-3">הוסף</Button>
     </div>
     {form.options.length > 0 && (
      <div className="flex flex-wrap gap-1.5 pt-1">
       {form.options.map(o => (
        <span key={o} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
         {o}
         <button type="button"onClick={() => removeOption(o)} className="hover:text-destructive">
          <X className="w-3 h-3"/>
         </button>
        </span>
       ))}
      </div>
     )}
    </div>
   )}

   <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground text-right">ערך</Label>
    {form.field_type === 'select' ? (
     <Select value={form.value || 'none'} onValueChange={v => update('value', v === 'none' ? '' : v)}>
      <SelectTrigger className="h-10 rounded-lg text-sm"><SelectValue placeholder="בחר ערך"/></SelectTrigger>
      <SelectContent dir="rtl">
       <SelectItem value="none">ללא</SelectItem>
       {form.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
     </Select>
    ) : form.field_type === 'date' ? (
     <DateField
      value={form.value}
      onChange={v => update('value', v)}
      placeholder="בחר תאריך"
      className="h-10 text-sm"
     />
    ) : (
     <Input
      type={form.field_type === 'number' ? 'number' : 'text'}
      value={form.value}
      onChange={e => update('value', e.target.value)}
      className="h-10 rounded-lg text-sm"
      dir={form.field_type === 'text' ? 'rtl' : 'ltr'}
     />
    )}
   </div>

   <div className="flex gap-2 pt-2 border-t border-border sticky bottom-0 bg-background pb-1">
    <Button type="button"disabled={busy} onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm shadow-none gap-2 flex-1">
     {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
     {field ? 'עדכן' : 'הוסף שדה'}
    </Button>
    <Button type="button"variant="outline"onClick={onClose} className="rounded-full h-9 px-4 text-sm">ביטול</Button>
   </div>
  </div>
 );
}

export default function CustomFieldsSection({ projectId, canEdit = true, embedded = false, bare = false }) {
 const queryClient = useQueryClient();
 const [dialog, setDialog] = useState({ open: false, field: null });
 const [deleteDialog, setDeleteDialog] = useState({ open: false, field: null });

 const { data: fields = [] } = useQuery({
  queryKey: ['customFields', projectId],
  queryFn: async () => {
   const res = await api.functions.invoke('manageCustomField', { action: 'list', project_ref: projectId });
   const data = res.data || res;
   return data.fields || [];
  },
  enabled: !!projectId,
 });

 const deleteMutation = useMutation({
  mutationFn: (id) => api.functions.invoke('manageCustomField', { action: 'delete', project_ref: projectId, field_id: id }),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customFields', projectId] }); setDeleteDialog({ open: false, field: null }); toast.success('שדה נמחק'); },
  onError: (err) => { toast.error(getErrorMessage(err)); console.error('[CustomField delete]', err); },
 });

 // Read-only mode: show explanation when user lacks edit permission
 if (!canEdit && fields.length === 0) return null;

 const readOnlyBanner = !canEdit && fields.length > 0 && !bare && !embedded ? (
  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-3">
   <Lock className="w-3.5 h-3.5 flex-shrink-0"/>
   אין לך הרשאת עריכה בפרויקט זה
  </div>
 ) : null;

 // Bare mode — render only the field chips themselves, with no section wrapper,
 // title, "custom field"framing or empty-state. Used at the bottom of the project overview.
 // When canEdit is true, each chip exposes inline edit + delete actions.
 if (bare) {
  if (fields.length === 0) return null;
  return (
   <>
    <div className="flex flex-wrap gap-2"dir="rtl">
     {fields.map(field => {
      const cfg = TYPE_CONFIG[field.field_type] || TYPE_CONFIG.text;
      const Icon = cfg.icon;
      return (
       <span key={field.id} className="group inline-flex items-center gap-1.5 text-xs font-bold text-foreground leading-none whitespace-nowrap">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
        {(() => { const v = formatValue(field); return v !== null ? `${field.label}: ${v}` : field.label; })()}
        {canEdit && (
         <span className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ms-0.5">
          <button type="button"onClick={() => setDialog({ open: true, field })} className="hover:bg-muted hover:text-foreground rounded w-3.5 h-3.5 flex items-center justify-center transition-colors">
           <Pencil className="w-2.5 h-2.5"/>
          </button>
          <button type="button"onClick={() => setDeleteDialog({ open: true, field })} className="hover:bg-muted hover:text-foreground rounded w-3.5 h-3.5 flex items-center justify-center transition-colors">
           <Trash2 className="w-2.5 h-2.5"/>
          </button>
         </span>
        )}
       </span>
      );
     })}
    </div>

    <Sheet open={dialog.open} onOpenChange={open => !open && setDialog({ open: false, field: null })}>
     <SheetContent side="left"dir="rtl"className="w-full sm:max-w-md p-0 flex flex-col">
      <SheetHeader className="px-5 py-3.5 border-b border-border text-right shrink-0">
       <SheetTitle className="text-base font-bold">
        {dialog.field ? 'עריכת שדה' : 'הוספת שדה מותאם אישית'}
       </SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-5 py-4">
       <CustomFieldForm field={dialog.field} projectId={projectId} onClose={() => setDialog({ open: false, field: null })} />
      </div>
     </SheetContent>
    </Sheet>

    <DeleteDialog
     open={deleteDialog.open}
     onOpenChange={open => !open && setDeleteDialog({ open: false, field: null })}
     onConfirm={() => deleteMutation.mutate(deleteDialog.field?.id)}
     title="מחיקת שדה"
     itemName={deleteDialog.field?.label}
    />
   </>
  );
 }

 const Wrapper = embedded ? 'div' : 'div';
 const wrapperClass = embedded ? '' : 'bg-card rounded-lg border border-border p-5 shadow-sm';

 return (
  <Wrapper className={wrapperClass} dir="rtl">
   {!embedded && (
    <div className="flex items-center justify-between mb-4">
     <h3 className="text-base font-bold text-foreground flex items-center gap-2">
      <SlidersHorizontal className="w-4 h-4 text-primary"/>
      שדות מותאמים אישית
     </h3>
     {canEdit && (
      <Button
       type="button"
       size="sm"
       onClick={() => setDialog({ open: true, field: null })}
       className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 px-4 text-xs font-semibold shadow-none gap-1"
      >
       <Plus className="w-3.5 h-3.5"/> הוסף שדה
      </Button>
     )}
    </div>
   )}
   {readOnlyBanner}
   {embedded ? (
    <div className="flex flex-wrap items-center gap-2">
     {fields.map(field => {
      const cfg = TYPE_CONFIG[field.field_type] || TYPE_CONFIG.text;
      const Icon = cfg.icon;
      return (
       <span key={field.id} className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
        <Icon className="w-3 h-3 flex-shrink-0"/>
        {(() => { const v = formatValue(field); return v !== null ? `${field.label}: ${v}` : field.label; })()}
        {canEdit && (
         <span className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ms-0.5">
          <button type="button"onClick={() => setDialog({ open: true, field })} className="hover:bg-primary/20 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors">
           <Pencil className="w-2.5 h-2.5"/>
          </button>
          <button type="button"onClick={() => setDeleteDialog({ open: true, field })} className="hover:bg-primary/20 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors">
           <Trash2 className="w-2.5 h-2.5"/>
          </button>
         </span>
        )}
       </span>
      );
     })}
     {canEdit && (
      <button type="button"onClick={() => setDialog({ open: true, field: null })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary text-xs font-medium transition-colors">
       <Plus className="w-3 h-3"/> הוסף שדה
      </button>
     )}
    </div>
   ) : (
    <>
     {fields.length === 0 ? (
      <EmptyState
       icon={SlidersHorizontal}
       title="אין שדות מותאמים אישית"
       description={canEdit ? "הוסף שדות דינמיים בהתאם לצרכי הפרויקט.": null}
       action={canEdit ? (
        <Button
         type="button"
         size="sm"
         onClick={() => setDialog({ open: true, field: null })}
         className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 px-4 text-xs font-semibold shadow-none gap-1"
        >
         <Plus className="w-3.5 h-3.5"/> הוסף שדה
        </Button>
       ) : null}
      />
     ) : (
      <div className="flex flex-wrap gap-2">
       {fields.map(field => {
        const cfg = TYPE_CONFIG[field.field_type] || TYPE_CONFIG.text;
        const Icon = cfg.icon;
        return (
         <span key={field.id} className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
          <Icon className="w-3 h-3 flex-shrink-0"/>
          {(() => { const v = formatValue(field); return v !== null ? `${field.label}: ${v}` : field.label; })()}
          {canEdit && (
           <span className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ms-0.5">
            <button type="button"onClick={() => setDialog({ open: true, field })} className="hover:bg-primary/20 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors">
             <Pencil className="w-2.5 h-2.5"/>
            </button>
            <button type="button"onClick={() => setDeleteDialog({ open: true, field })} className="hover:bg-primary/20 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors">
             <Trash2 className="w-2.5 h-2.5"/>
            </button>
           </span>
          )}
         </span>
        );
       })}
      </div>
     )}
    </>
   )}

   <Sheet open={dialog.open} onOpenChange={open => !open && setDialog({ open: false, field: null })}>
    <SheetContent side="left"dir="rtl"className="w-full sm:max-w-md p-0 flex flex-col">
     <SheetHeader className="px-5 py-3.5 border-b border-border text-right shrink-0">
      <SheetTitle className="text-base font-bold">
       {dialog.field ? 'עריכת שדה' : 'הוספת שדה מותאם אישית'}
      </SheetTitle>
     </SheetHeader>
     <div className="flex-1 overflow-y-auto px-5 py-4">
      <CustomFieldForm field={dialog.field} projectId={projectId} onClose={() => setDialog({ open: false, field: null })} />
     </div>
    </SheetContent>
   </Sheet>

   <DeleteDialog
    open={deleteDialog.open}
    onOpenChange={open => !open && setDeleteDialog({ open: false, field: null })}
    onConfirm={() => deleteMutation.mutate(deleteDialog.field?.id)}
    title="מחיקת שדה"
    itemName={deleteDialog.field?.label}
   />
    </Wrapper>
    );
    }
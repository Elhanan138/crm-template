import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import PopupLivePreview from './PopupLivePreview';
import PopupAIAssistant from './PopupAIAssistant';
import { useI18n } from '@/lib/i18n';

const toDateTimeLocal = (iso) => {
 if (!iso) return '';
 const d = new Date(iso);
 if (isNaN(d)) return '';
 const tzOffset = d.getTimezoneOffset() * 60000;
 return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};
const fromDateTimeLocal = (val) => val ? new Date(val).toISOString() : null;

export default function PopupEditorSheet({ open, popup, onClose }) {
  const { t } = useI18n();
 const queryClient = useQueryClient();
 const isEdit = !!popup;

 const [form, setForm] = useState({
  title: '', content: '', layoutType: 'announcement', mediaUrl: '',
  ctaLabel: '', ctaUrl: '', status: 'draft', startsAt: '', endsAt: '',
  frequency: 'once_ever', targetRole: 'all', showDismissCheckbox: false,
 });
 const [saving, setSaving] = useState(false);

 useEffect(() => {
  if (popup) {
   setForm({
    title: popup.title || '', content: popup.content || '',
    layoutType: popup.layoutType || 'announcement',
    mediaUrl: popup.mediaUrl || '', ctaLabel: popup.ctaLabel || '',
    ctaUrl: popup.ctaUrl || '', status: popup.status || 'draft',
    startsAt: toDateTimeLocal(popup.startsAt), endsAt: toDateTimeLocal(popup.endsAt),
    frequency: popup.frequency || 'once_ever', targetRole: popup.targetRole || 'all',
    showDismissCheckbox: popup.showDismissCheckbox || false,
   });
  } else {
   setForm({ title: '', content: '', layoutType: 'announcement', mediaUrl: '', ctaLabel: '', ctaUrl: '', status: 'draft', startsAt: '', endsAt: '', frequency: 'once_ever', targetRole: 'all', showDismissCheckbox: false });
  }
 }, [popup, open]);

 const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

 const handleAIGenerated = (data) => {
  setForm(f => ({
   ...f,
   title: data.title || f.title,
   content: data.content || f.content,
   layoutType: data.layoutType || f.layoutType,
   ctaLabel: data.ctaLabel !== undefined ? data.ctaLabel : f.ctaLabel,
  }));
 };

 const handleSave = async (e) => {
  e.preventDefault();
  if (!form.title.trim()) { toast.error(t("כותרת חובה")); return; }
  setSaving(true);
  try {
   const payload = {
    ...form,
    startsAt: fromDateTimeLocal(form.startsAt),
    endsAt: fromDateTimeLocal(form.endsAt),
   };
   if (isEdit) {
    await api.entities.AnnouncementPopup.update(popup.id, payload);
    toast.success(t("הפופאפ עודכן"));
   } else {
    await api.entities.AnnouncementPopup.create(payload);
    toast.success(t("הפופאפ נוצר"));
   }
   queryClient.invalidateQueries({ queryKey: ['announcementPopups'] });
   onClose();
  } catch (err) {
   toast.error(t("השמירה נכשלה"));
  } finally {
   setSaving(false);
  }
 };

 const previewPopup = { ...form, id: popup?.id || 'preview' };

 return (
  <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
   <SheetContent side="left"className="w-full sm:max-w-4xl overflow-y-auto p-0">
    <SheetHeader className="px-6 py-5 border-b border-border text-right">
     <SheetTitle className="text-base font-bold">{isEdit ? 'עריכת פופאפ' : 'יצירת פופאפ חדש'}</SheetTitle>
    </SheetHeader>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
     {/* Form side (right in RTL) */}
     <form onSubmit={handleSave} className="p-6 space-y-4 lg:border-l border-border">
      <div>
       <Label className="text-xs font-medium text-muted-foreground mb-2 block">{t("יצירת תוכן עם AI")}</Label>
       <PopupAIAssistant onGenerated={handleAIGenerated} />
      </div>

      <div className="space-y-1.5">
       <Label className="text-xs font-medium text-muted-foreground">{t("כותרת *")}</Label>
       <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={t("כותרת הפופאפ")}className="h-9 rounded-lg"/>
      </div>

      <div className="space-y-1.5">
       <Label className="text-xs font-medium text-muted-foreground">{t("תוכן (Markdown)")}</Label>
       <Textarea value={form.content} onChange={(e) => set('content', e.target.value)} placeholder={t("תוכן ההודעה...")}rows={5} className="rounded-lg text-sm"/>
      </div>

      <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("סוג עיצוב")}</Label>
        <Select value={form.layoutType} onValueChange={(v) => set('layoutType', v)}>
         <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
         <SelectContent>
          <SelectItem value="announcement">{t("הכרזה")}</SelectItem>
          <SelectItem value="changelog">{t("מה חדש")}</SelectItem>
          <SelectItem value="alert">{t("התראה")}</SelectItem>
         </SelectContent>
        </Select>
       </div>
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("סטטוס")}</Label>
        <Select value={form.status} onValueChange={(v) => set('status', v)}>
         <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
         <SelectContent>
          <SelectItem value="draft">{t("טיוטה")}</SelectItem>
          <SelectItem value="scheduled">{t("מתוזמן")}</SelectItem>
          <SelectItem value="active">{t("פעיל")}</SelectItem>
          <SelectItem value="archived">{t("בארכיון")}</SelectItem>
         </SelectContent>
        </Select>
       </div>
      </div>

      <div className="space-y-1.5">
       <Label className="text-xs font-medium text-muted-foreground">{t("כתובת תמונה (אופציונלי)")}</Label>
       <Input value={form.mediaUrl} onChange={(e) => set('mediaUrl', e.target.value)} placeholder="https://..."className="h-9 rounded-lg"dir="ltr"/>
      </div>

      <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("טקסט כפתור")}</Label>
        <Input value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder={t("למידע נוסף")}className="h-9 rounded-lg"/>
       </div>
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("כתובת כפתור")}</Label>
        <Input value={form.ctaUrl} onChange={(e) => set('ctaUrl', e.target.value)} placeholder="https://..."className="h-9 rounded-lg"dir="ltr"/>
       </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("תאריך התחלה")}</Label>
        <Input type="datetime-local"value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="h-9 rounded-lg"/>
       </div>
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("תאריך סיום")}</Label>
        <Input type="datetime-local"value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="h-9 rounded-lg"/>
       </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("תדירות הצגה")}</Label>
        <Select value={form.frequency} onValueChange={(v) => set('frequency', v)}>
         <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
         <SelectContent>
          <SelectItem value="once_ever">{t("פעם אחת לעולם")}</SelectItem>
          <SelectItem value="once_per_session">{t("פעם אחת לסשן")}</SelectItem>
          <SelectItem value="every_login">{t("בכל כניסה")}</SelectItem>
         </SelectContent>
        </Select>
       </div>
       <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{t("קהל יעד")}</Label>
        <Select value={form.targetRole} onValueChange={(v) => set('targetRole', v)}>
         <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
         <SelectContent>
          <SelectItem value="all">{t("כולם")}</SelectItem>
          <SelectItem value="admin">{t("אדמינים בלבד")}</SelectItem>
          <SelectItem value="user">{t("משתמשים בלבד")}</SelectItem>
         </SelectContent>
        </Select>
       </div>
      </div>

      <div className="flex items-center gap-2">
       <Checkbox checked={form.showDismissCheckbox} onCheckedChange={(v) => set('showDismissCheckbox', v)} id="dismiss-checkbox"/>
       <Label htmlFor="dismiss-checkbox"className="text-xs font-medium text-muted-foreground cursor-pointer">
        הצג צ'קבוקס "אל תציג שוב"(סנכרון לבקאנד)
       </Label>
      </div>

      <div className="flex gap-2 justify-start pt-3 border-t border-border">
       <Button type="submit"disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm gap-2">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
        {isEdit ? 'עדכן' : 'צור פופאפ'}
       </Button>
       <Button type="button"variant="outline"onClick={onClose} className="rounded-full h-9 px-4 text-sm">{t("ביטול")}</Button>
      </div>
     </form>

     {/* Preview side (left in RTL) */}
     <div className="p-6 bg-muted/20">
      <p className="text-xs font-medium text-muted-foreground mb-3 text-right">{t("תצפיה מקדימה")}</p>
      <PopupLivePreview popup={previewPopup} />
     </div>
    </div>
   </SheetContent>
  </Sheet>
 );
}
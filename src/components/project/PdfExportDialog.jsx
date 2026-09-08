import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, Loader2 } from 'lucide-react';
import {
 PDF_SECTIONS,
 ALL_SECTION_IDS,
 normalizeSections,
} from '@/lib/pdfSections';

export default function PdfExportDialog({ open, onClose, onExport }) {
 const [selected, setSelected] = useState(ALL_SECTION_IDS);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
  if (!open) return;
  let cancelled = false;
  api.auth.me()
   .then(user => {
    if (cancelled) return;
    const saved = user?.ui_prefs?.pdf_sections;
    if (saved && Array.isArray(saved) && saved.length > 0) {
     setSelected(normalizeSections(saved));
    } else {
     setSelected([...ALL_SECTION_IDS]);
    }
   })
   .catch(() => { if (!cancelled) setSelected([...ALL_SECTION_IDS]); });
  return () => { cancelled = true; };
 }, [open]);

 const toggle = (id) => {
  setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
 };
 const selectAll = () => setSelected([...ALL_SECTION_IDS]);
 const clearAll = () => setSelected([]);

 const handleExport = async () => {
  if (selected.length === 0) return;
  setSaving(true);
  try {
   const user = await api.auth.me();
   await api.auth.updateMe({
    ui_prefs: { ...(user?.ui_prefs || {}), pdf_sections: selected },
   });
  } catch { /* ignore save errors */ }
  setSaving(false);
  onExport(selected);
 };

 return (
  <Dialog open={open} onOpenChange={o => !o && onClose()}>
   <DialogContent className="sm:max-w-md rounded-lg"dir="rtl">
    <DialogHeader>
     <DialogTitle className="text-base font-bold text-right flex items-center gap-2">
      <FileDown className="w-4 h-4 text-primary"/>
      ייצוא דוח ל-PDF
     </DialogTitle>
    </DialogHeader>

    <div className="flex items-center gap-2 flex-wrap">
     <Button variant="outline"size="sm"className="h-7 text-xs rounded-full"onClick={selectAll}>בחר הכל</Button>
     <Button variant="outline"size="sm"className="h-7 text-xs rounded-full"onClick={clearAll}>נקה הכל</Button>
    </div>

    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pe-1">
     {PDF_SECTIONS.map(section => (
      <label key={section.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors">
       <Checkbox checked={selected.includes(section.id)} onCheckedChange={() => toggle(section.id)} />
       <span className="text-sm text-foreground">{section.label}</span>
      </label>
     ))}
    </div>

    {selected.length === 0 && (
     <p className="text-xs text-muted-foreground text-center">בחר לפחות סעיף אחד לייצוא</p>
    )}

    <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
     <Button
      variant="default"
      className="rounded-full gap-2"
      disabled={selected.length === 0 || saving}
      onClick={handleExport}
     >
      {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>}
      ייצא דוח
     </Button>
     <Button variant="outline"className="rounded-full"onClick={onClose}>ביטול</Button>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 );
}
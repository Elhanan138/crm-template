import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, Loader2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import {
  FIELD_TYPES, FIELD_TYPE_MAP, CUSTOM_FIELD_ENTITIES, fieldKeyFrom, sortFields,
} from '@/lib/customFields';

const INPUT = 'h-9 rounded-lg text-sm';

function FieldDialog({ open, onOpenChange, field, entity, existingKeys, onSave }) {
  const [draft, setDraft] = useState(
    () => field || { label: '', type: 'text', required: false, placeholder: '', help: '', options: [] }
  );
  const [optionsText, setOptionsText] = useState((field?.options || []).join('\n'));
  const type = FIELD_TYPE_MAP[draft.type];

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    const label = draft.label.trim();
    if (!label) return toast.error('שם השדה חובה');
    const options = optionsText.split('\n').map((o) => o.trim()).filter(Boolean);
    if (type?.hasOptions && options.length === 0) return toast.error('הוסף לפחות אפשרות אחת');
    onSave({
      ...draft,
      label,
      options,
      entity,
      key: draft.key || fieldKeyFrom(label, existingKeys),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{field ? 'עריכת שדה' : 'שדה חדש'}</DialogTitle>
          <DialogDescription>השדה יופיע בטופס היצירה והעריכה של הישות שנבחרה.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">שם השדה</Label>
            <Input value={draft.label} onChange={(e) => set({ label: e.target.value })} className={INPUT} placeholder="לדוגמה: מספר הזמנת רכש" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">סוג</Label>
            <Select value={draft.type} onValueChange={(v) => set({ type: v })}>
              <SelectTrigger className={INPUT}><SelectValue /></SelectTrigger>
              <SelectContent dir="rtl">
                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {type?.hasOptions && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">אפשרויות — שורה לכל אפשרות</Label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                dir="rtl"
                className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                placeholder={'נמוך\nבינוני\nגבוה'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">טקסט מציין מקום</Label>
              <Input value={draft.placeholder || ''} onChange={(e) => set({ placeholder: e.target.value })} className={INPUT} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">הסבר מתחת לשדה</Label>
              <Input value={draft.help || ''} onChange={(e) => set({ help: e.target.value })} className={INPUT} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={!!draft.required} onCheckedChange={(v) => set({ required: v === true })} />
            שדה חובה
          </label>
        </div>

        <DialogFooter>
          <Button onClick={save}>שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomFieldsPanel() {
  const queryClient = useQueryClient();
  const [entity, setEntity] = useState('Project');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: allFields = [], isLoading } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => api.entities.CustomField.list(),
  });

  const fields = sortFields(allFields.filter((f) => f.entity === entity));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...data }) =>
      id ? api.entities.CustomField.update(id, data) : api.entities.CustomField.create(data),
    onSuccess: () => { invalidate(); setDialogOpen(false); setEditing(null); toast.success('השדה נשמר'); },
    onError: (e) => toast.error(e?.message || 'שמירת השדה נכשלה'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.CustomField.delete(id),
    onSuccess: () => { invalidate(); toast.success('השדה נמחק'); },
    onError: (e) => toast.error(e?.message || 'מחיקת השדה נכשלה'),
  });

  const move = (field, delta) => {
    const ordered = sortFields(fields);
    const i = ordered.findIndex((f) => f.id === field.id);
    const j = i + delta;
    if (j < 0 || j >= ordered.length) return;
    api.entities.CustomField.update(ordered[i].id, { order: j })
      .then(() => api.entities.CustomField.update(ordered[j].id, { order: i }))
      .then(invalidate);
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">שדות מותאמים</h3>
              <p className="text-[11px] text-muted-foreground">הוסף שדות משלך לטפסים במערכת — ללא שינוי קוד</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> שדה חדש
          </Button>
        </div>

        <div className="flex gap-1 bg-muted/40 rounded-lg p-1 mb-4">
          {CUSTOM_FIELD_ENTITIES.map((e) => (
            <button
              key={e.value}
              onClick={() => setEntity(e.value)}
              className={`flex-1 text-xs py-2 rounded-md transition-colors ${
                entity === e.value
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : fields.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            אין עדיין שדות מותאמים ל{CUSTOM_FIELD_ENTITIES.find((e) => e.value === entity)?.label}.
          </p>
        ) : (
          <div className="space-y-1.5">
            {fields.map((field, i) => {
              const Icon = FIELD_TYPE_MAP[field.type]?.icon || SlidersHorizontal;
              return (
                <div key={field.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {FIELD_TYPE_MAP[field.type]?.label}
                      {field.options?.length ? ` · ${field.options.length} אפשרויות` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(field, -1)} disabled={i === 0} aria-label="הזז למעלה">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(field, 1)} disabled={i === fields.length - 1} aria-label="הזז למטה">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(field); setDialogOpen(true); }} aria-label="עריכה">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(field.id)} aria-label="מחיקה">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dialogOpen && (
        <FieldDialog
          open={dialogOpen}
          onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
          field={editing}
          entity={entity}
          existingKeys={allFields.map((f) => f.key)}
          onSave={(data) => saveMutation.mutate({ ...data, order: editing?.order ?? fields.length })}
        />
      )}
    </div>
  );
}

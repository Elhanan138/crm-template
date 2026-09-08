import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateField from '@/components/ui/date-field';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Table as TableIcon } from 'lucide-react';

/**
 * Renders a form template.
 * - fillable=false (default): builder-side static preview (inputs disabled).
 * - fillable=true: interactive form the user can actually fill; values/onChange
 *  drive a controlled answers object keyed by field id.
 */
export default function FormPreview({ title, description, fields, fillable = false, values = {}, onChange }) {
 const set = (id, v) => onChange && onChange(id, v);
 const disabled = !fillable;

 return (
  <div dir="rtl"className="bg-card rounded-lg border border-border shadow-sm p-5 sm:p-6 space-y-4">
   <div>
    <h2 className="text-lg font-bold text-foreground break-words">{title || 'טופס ללא כותרת'}</h2>
    {description && <p className="text-sm text-muted-foreground mt-1 break-words">{description}</p>}
   </div>
   {fields.length === 0 ? (
    <p className="text-sm text-muted-foreground text-center py-8">אין שדות עדיין — הוסף שדות כדי לראות תצוגה מקדימה.</p>
   ) : (
    <div className="space-y-3.5">
     {fields.map((f) => (
      <div key={f.id} className="space-y-1.5">
       {f.type !== 'checkbox' && (
        <Label className="text-xs font-medium text-foreground">
         {f.label || 'שדה ללא שם'} {f.required && <span className="text-destructive">*</span>}
        </Label>
       )}
       {f.type === 'text' && (
        <Input placeholder={f.placeholder} className="h-9 rounded-md text-sm"dir="rtl"disabled={disabled}
         value={values[f.id] || ''} onChange={(e) => set(f.id, e.target.value)} />
       )}
       {f.type === 'textarea' && (
        <Textarea placeholder={f.placeholder} className="rounded-md text-sm min-h-[72px]"dir="rtl"disabled={disabled}
         value={values[f.id] || ''} onChange={(e) => set(f.id, e.target.value)} />
       )}
       {f.type === 'number' && (
        <Input type="number"placeholder={f.placeholder} className="h-9 rounded-md text-sm"dir="rtl"disabled={disabled}
         value={values[f.id] || ''} onChange={(e) => set(f.id, e.target.value)} />
       )}
       {f.type === 'date' && (
        <DateField disabled={disabled}
         value={values[f.id] || ''} onChange={(v) => set(f.id, v)} className="h-9 text-sm"/>
       )}
       {f.type === 'select' && (
        <Select disabled={disabled} value={values[f.id] || ''} onValueChange={(v) => set(f.id, v)}>
         <SelectTrigger className="h-9 rounded-md text-sm"><SelectValue placeholder={f.placeholder || 'בחר...'} /></SelectTrigger>
         <SelectContent dir="rtl">
          {(f.options || []).map((o, i) => <SelectItem key={i} value={o || `opt-${i}`}>{o || `אפשרות ${i + 1}`}</SelectItem>)}
         </SelectContent>
        </Select>
       )}
       {f.type === 'checkbox' && (
        <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
         <Checkbox disabled={disabled} checked={!!values[f.id]} onCheckedChange={(v) => set(f.id, !!v)} />
         {f.label || 'שדה ללא שם'} {f.required && <span className="text-destructive">*</span>}
        </label>
       )}
       {f.type === 'checklist' && (
        <div className="space-y-2">
         {(f.options || []).map((opt, i) => {
          const selected = Array.isArray(values[f.id]) ? values[f.id].includes(opt) : false;
          return (
           <label key={i} className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
            <Checkbox disabled={disabled} checked={selected} onCheckedChange={(v) => {
             const current = Array.isArray(values[f.id]) ? values[f.id] : [];
             set(f.id, v ? [...current, opt] : current.filter(x => x !== opt));
            }} />
            {opt || `אפשרות ${i + 1}`}
           </label>
          );
         })}
        </div>
       )}
       {f.type === 'table' && (
        <TableField
         field={f}
         disabled={disabled}
         value={values[f.id]}
         onChange={(v) => set(f.id, v)}
        />
       )}
      </div>
     ))}
    </div>
   )}
  </div>
 );
}

/**
 * Interactive table field with add/remove rows and columns.
 * Value: array of row objects { [columnId]: value }
 */
function TableField({ field, disabled, value, onChange }) {
 const columns = field.columns || [];
 const rows = Array.isArray(value) ? value : [];

 const updateCell = (rowIdx, colIdx, val) => {
  const newRows = rows.map((r, i) => i === rowIdx ? { ...r, [`col${colIdx}`]: val } : r);
  onChange(newRows);
 };

 const addRow = () => {
  const newRow = {};
  columns.forEach((_, i) => { newRow[`col${i}`] = ''; });
  onChange([...rows, newRow]);
 };

 const removeRow = (rowIdx) => {
  onChange(rows.filter((_, i) => i !== rowIdx));
 };

 // Auto-add a first empty row in fill mode when the table has columns but no rows yet
 React.useEffect(() => {
  if (!disabled && columns.length > 0 && rows.length === 0 && onChange) {
   const newRow = {};
   columns.forEach((_, i) => { newRow[`col${i}`] = ''; });
   onChange([newRow]);
  }
 }, [disabled, columns.length]);

 if (columns.length === 0) {
  return (
   <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-3">
    <TableIcon className="w-3.5 h-3.5 flex-shrink-0"/>
    הוסף עמודות במאפייני השדה כדי להציג את הטבלה
   </div>
  );
 }

 return (
  <div className="rounded-lg border border-border overflow-hidden">
   <div className="overflow-x-auto">
    <table className="w-full text-xs">
     <thead>
      <tr className="bg-muted/40 border-b border-border">
       {columns.map((col, i) => (
        <th key={i} className="px-2 py-2 text-right font-semibold text-foreground whitespace-nowrap">
         {col || `עמודה ${i + 1}`}
        </th>
       ))}
       {!disabled && <th className="px-2 py-2 w-8"/>}
      </tr>
     </thead>
     <tbody>
      {rows.length === 0 ? (
       <tr>
        <td colSpan={columns.length + 1} className="px-2 py-4 text-center text-muted-foreground">
         {disabled ? 'אין נתונים' : 'לחץ "הוסף שורה"להתחלת מילוי'}
        </td>
       </tr>
      ) : (
       rows.map((row, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
         {columns.map((_, colIdx) => (
          <td key={colIdx} className="px-1 py-1">
           <Input
            disabled={disabled}
            value={row[`col${colIdx}`] || ''}
            onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
            className="h-8 rounded-md text-xs border-transparent focus:border-border"
            dir="rtl"
           />
          </td>
         ))}
         {!disabled && (
          <td className="px-1 py-1 text-center">
           <button
            type="button"
            onClick={() => removeRow(rowIdx)}
            className="w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
            title="הסר שורה"
           >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive"/>
           </button>
          </td>
         )}
        </tr>
       ))
      )}
     </tbody>
    </table>
   </div>
   {!disabled && (
    <div className="border-t border-border px-2 py-1.5 bg-muted/20">
     <Button type="button"variant="ghost"size="sm"onClick={addRow} className="h-7 text-xs gap-1 rounded-full">
      <Plus className="w-3 h-3"/> הוסף שורה
     </Button>
    </div>
   )}
  </div>
 );
}
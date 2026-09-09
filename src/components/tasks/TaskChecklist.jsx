import React, { useState } from 'react';
import { Check, Trash2, Plus, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Checklist editor — upgraded design with progress bar,
 * smooth checkbox animations, polished add-row,
 * slide-in animation for new items, and undo-delete.
 */
export default function TaskChecklist({ items = [], onChange }) {
 const [newText, setNewText] = useState('');

 const add = () => {
  const text = newText.trim();
  if (!text) return;
  onChange([...items, { id: crypto.randomUUID(), text, done: false }]);
  setNewText('');
 };

 const toggle = (id) => {
  onChange(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
 };

 const updateText = (id, text) => {
  onChange(items.map(i => i.id === id ? { ...i, text } : i));
 };

 const remove = (id) => {
  const removed = items.find(i => i.id === id);
  const remaining = items.filter(i => i.id !== id);
  onChange(remaining);

  if (!removed) return;
  let undone = false;
  toast('פריט צ\'קליסט נמחק', {
   duration: 2500,
   action: {
    label: 'בטל',
    onClick: () => {
     undone = true;
     // Restore at the original position
     const idx = items.findIndex(i => i.id === id);
     const restored = [...items];
     restored.splice(idx, 0, removed);
     onChange(restored);
     toast.success('המחיקה בוטלה');
    },
   },
  });
 };

 const doneCount = items.filter(i => i.done).length;
 const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

 return (
  <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
   {/* Header with progress bar */}
   <div className="px-4 py-2.5 border-b border-border">
    <div className="flex items-center justify-between mb-1.5">
     <div className="flex items-center gap-2">
      <ListChecks className="w-3.5 h-3.5 text-muted-foreground"/>
      <h3 className="text-xs font-semibold text-foreground">צ'קליסט</h3>
      {items.length > 0 && (
       <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{doneCount}/{items.length}</span>
      )}
     </div>
     {items.length > 0 && (
      <span className="text-[10px] font-medium text-muted-foreground">{progress}%</span>
     )}
    </div>
    {items.length > 0 && (
     <div className="h-1 rounded-full bg-muted overflow-hidden">
      <div
       className="h-full bg-primary rounded-full transition-all duration-300"
       style={{ width: `${progress}%` }}
      />
     </div>
    )}
   </div>

   {/* Items */}
   {items.length > 0 && (
    <div className="divide-y divide-border">
     {items.map(item => (
      <div key={item.id} className="flex items-center gap-2.5 px-4 py-2 group hover:bg-muted/30 transition-colors animate-slide-in">
       <button
        onClick={() => toggle(item.id)}
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.done ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/30 hover:border-primary/50 hover:scale-110'}`}
       >
        {item.done && <Check className="w-2.5 h-2.5 text-primary-foreground"/>}
       </button>
       <input
        value={item.text}
        onChange={e => updateText(item.id, e.target.value)}
        className={`flex-1 bg-transparent text-xs outline-none text-right transition-all ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
       />
       <button
        onClick={() => remove(item.id)}
        className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="מחק פריט"
       >
        <Trash2 className="w-3 h-3"/>
       </button>
      </div>
     ))}
    </div>
   )}

   {/* Add row */}
   <div className="px-4 py-2 flex items-center gap-2 border-t border-border">
    <div className="w-4 h-4 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
     <Plus className="w-2.5 h-2.5 text-muted-foreground/50"/>
    </div>
    <input
     value={newText}
     onChange={e => setNewText(e.target.value)}
     onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
     placeholder="הוסף פריט לצ'קליסט…"
     className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground text-right text-foreground"
    />
    {newText.trim() && (
     <button onClick={add} className="text-[11px] text-primary hover:underline font-medium">הוסף</button>
    )}
   </div>
  </div>
 );
}
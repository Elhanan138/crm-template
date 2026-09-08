import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';

const BLOCK_OPTIONS = [
 { id: 'paragraph', label: 'טקסט רגיל', className: 'text-sm text-foreground' },
 { id: 'heading1', label: 'כותרת 1', className: 'text-xl font-bold text-foreground' },
 { id: 'heading2', label: 'כותרת 2', className: 'text-lg font-bold text-foreground' },
 { id: 'heading3', label: 'כותרת 3', className: 'text-base font-semibold text-foreground' },
];

export default function BlockTypeSelect({ editor }) {
 const [open, setOpen] = useState(false);
 if (!editor) return null;

 const currentBlock = (() => {
  if (editor.isActive('heading', { level: 1 })) return BLOCK_OPTIONS[1];
  if (editor.isActive('heading', { level: 2 })) return BLOCK_OPTIONS[2];
  if (editor.isActive('heading', { level: 3 })) return BLOCK_OPTIONS[3];
  return BLOCK_OPTIONS[0];
 })();

 const handleSelect = (id) => {
  if (id === 'paragraph') editor.chain().focus().setParagraph().run();
  else if (id === 'heading1') editor.chain().focus().setNode('heading', { level: 1 }).run();
  else if (id === 'heading2') editor.chain().focus().setNode('heading', { level: 2 }).run();
  else if (id === 'heading3') editor.chain().focus().setNode('heading', { level: 3 }).run();
  setOpen(false);
 };

 return (
  <Popover open={open} onOpenChange={setOpen}>
   <PopoverTrigger asChild>
    <Button variant="ghost"size="sm"className="h-9 px-2 gap-1 text-sm font-medium">
     <span className={currentBlock.className}>{currentBlock.label}</span>
     <ChevronDown className="w-3.5 h-3.5 text-muted-foreground"/>
    </Button>
   </PopoverTrigger>
   <PopoverContent align="start"className="w-48 p-1"dir="rtl">
    {BLOCK_OPTIONS.map(opt => (
     <button
      key={opt.id}
      onClick={() => handleSelect(opt.id)}
      className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-accent transition-colors"
     >
      <span className={opt.className}>{opt.label}</span>
      {currentBlock.id === opt.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0"/>}
     </button>
    ))}
   </PopoverContent>
  </Popover>
 );
}
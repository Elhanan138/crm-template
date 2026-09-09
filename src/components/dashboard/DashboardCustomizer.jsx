import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { GripVertical, RotateCcw, ChevronDown, SlidersHorizontal } from 'lucide-react';

/**
 * Slide-over panel for customizing the dashboard:
 * - toggle visibility
 * - drag to reorder
 * - per-widget options (e.g. how many rows to show) via the inline settings row
 * Pure UI — parent owns the state object { order, hidden, options }.
 */
export default function DashboardCustomizer({ open, onClose, widgets, order, hidden, options = {}, onChange, onReset }) {
 const [expanded, setExpanded] = useState(null);

 const orderedWidgets = order.map(id => widgets.find(w => w.id === id)).filter(Boolean);

 const emit = (patch) => onChange({ order, hidden, options, ...patch });

 // Prevent click events from bubbling to the Draggable wrapper
 const stopClick = (e) => e.stopPropagation();

 const handleDragEnd = (result) => {
  if (!result.destination) return;
  const next = [...order];
  const [moved] = next.splice(result.source.index, 1);
  next.splice(result.destination.index, 0, moved);
  emit({ order: next });
 };

 const toggle = (id) => {
  const next = hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id];
  emit({ hidden: next });
 };

 const setOption = (id, key, value) => {
  emit({ options: { ...options, [id]: { ...(options[id] || {}), [key]: value } } });
 };

 const LIMIT_CHOICES = [3, 5, 6, 8, 10];

 return (
  <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
   <SheetContent side="left"className="w-full sm:max-w-md p-0">
    <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
     <SheetTitle className="text-right text-lg flex items-center gap-2 ps-10">
      <SlidersHorizontal className="w-5 h-5 text-primary"/> התאמת דף הבית
     </SheetTitle>
     <p className="text-xs text-muted-foreground text-right">הצג/הסתר ווידג'טים, גרור לסידור מחדש, ופתח את גלגל ההגדרות לכל ווידג'ט להתאמות נוספות</p>
    </SheetHeader>

    <div className="p-4 space-y-2 overflow-y-auto"style={{ maxHeight: 'calc(100vh - 160px)' }}>
     <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="widgets">
       {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
         {orderedWidgets.map((w, index) => {
          const Icon = w.icon;
          const isVisible = !hidden.includes(w.id);
          const isOpen = expanded === w.id;
          const opt = options[w.id] || {};
          const canSpan = w.id !== 'stats';
          const hasOptions = (w.configurable && w.configurable.length > 0) || !!w.renderExtraConfig || canSpan;
          return (
           <Draggable key={w.id} draggableId={w.id} index={index}>
            {(prov, snapshot) => (
             <div
              ref={prov.innerRef}
              {...prov.draggableProps}
              className={`rounded-lg border bg-card transition-shadow ${snapshot.isDragging ? 'border-primary shadow-md' : 'border-border'}`}
             >
              <div className="flex items-center gap-3 px-3 py-2.5">
               <span {...prov.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4"/>
               </span>
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isVisible ? 'bg-accent' : 'bg-muted'}`}>
                <Icon className={`w-4 h-4 ${isVisible ? 'text-primary' : 'text-muted-foreground'}`} />
               </div>
               <span className="flex-1 text-sm font-medium text-foreground truncate">{w.title}</span>
               {hasOptions && (
                <button
                 onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : w.id); }}
                 className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isOpen ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                 title="הגדרות ווידג'ט"
                >
                 <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
               )}
               <span dir="ltr"onClick={stopClick}><Switch checked={isVisible} onCheckedChange={() => toggle(w.id)} /></span>
              </div>

              {hasOptions && isOpen && (
               <div className="px-3 pb-3 pt-1 border-t border-border/60 mt-1 space-y-3">
                {canSpan && (
                 <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">רוחב</p>
                  <div className="flex gap-1.5">
                   {[
                    { value: 'half', label: 'חצי' },
                    { value: 'full', label: 'מלא' },
                   ].map(choice => {
                    const currentSpan = opt.span || w.span;
                    const active = currentSpan === choice.value;
                    return (
                     <button key={choice.value} onClick={() => setOption(w.id, 'span', choice.value)}
                      className={`flex-1 py-1.5 rounded-full text-xs font-semibold border transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}>
                      {choice.label}
                     </button>
                    );
                   })}
                  </div>
                 </div>
                )}
                {w.configurable?.includes('limit') && (
                 <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">מספר פריטים מקסימלי</p>
                  <div className="flex gap-1.5">
                   {LIMIT_CHOICES.map(n => {
                    const active = (opt.limit || w.defaultLimit || 5) === n;
                    return (
                     <button key={n} onClick={() => setOption(w.id, 'limit', n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}>
                      {n}
                     </button>
                    );
                   })}
                  </div>
                 </div>
                )}
                {w.renderExtraConfig && w.renderExtraConfig({ options: opt, setOption: (k, v) => setOption(w.id, k, v) })}
               </div>
              )}
             </div>
            )}
           </Draggable>
          );
         })}
         {provided.placeholder}
        </div>
       )}
      </Droppable>
     </DragDropContext>
    </div>

    <div className="absolute bottom-0 inset-x-0 border-t border-border bg-card p-4 flex items-center gap-2">
     <Button onClick={onClose} className="flex-1 rounded-full bg-primary hover:bg-primary/90">סיום</Button>
     <Button variant="outline"onClick={onReset} className="rounded-full gap-1.5 text-xs">
      <RotateCcw className="w-3.5 h-3.5"/> איפוס
     </Button>
    </div>
   </SheetContent>
  </Sheet>
 );
}
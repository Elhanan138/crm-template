import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * Compact project tab navigation with inline drag-and-drop reordering on desktop.
 * The inline tab bar is draggable; the mobile dropdown reflects the saved order.
 */
export default function ProjectTabNav({ tabs, activeId, onChange, onReorder }) {
  const [items, setItems] = useState(tabs);

  // Keep local order in sync when the tabs array changes (e.g. visibility toggle).
  React.useEffect(() => {
    setItems(prev => {
      const byId = Object.fromEntries(prev.map(t => [t.id, t]));
      return tabs.map(t => byId[t.id] || t);
    });
  }, [tabs]);

  const active = items.find(t => t.id === activeId) || items[0];
  const canDrag = typeof onReorder === 'function' && items.length > 1;

  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = Array.from(items);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setItems(next);
    onReorder(next.map(t => t.id));
  };

  if (!active) return null;
  const ActiveIcon = active.icon;

  return (
    <div className="flex items-center justify-between gap-2 mb-6">
      {/* Inline tabs — draggable on large screens */}
      <div className="hidden lg:block w-full">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tabNav" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-1.5 overflow-x-auto"
              >
                {items.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = tab.id === activeId;
                  return (
                    <Draggable key={tab.id} draggableId={tab.id} index={index} isDragDisabled={!canDrag}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`rounded-lg whitespace-nowrap transition-all select-none ${
                            snapshot.isDragging ? 'shadow-md ring-1 ring-primary/30 z-50' : ''
                          } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        >
                          <button
                            onClick={() => onChange(tab.id)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                              isActive
                                ? 'bg-card text-primary shadow-sm font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                            <span>{tab.label}</span>
                          </button>
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

      {/* Dropdown — primary control on small/medium screens */}
      <div className="lg:hidden w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between gap-2 bg-card border border-border rounded-lg shadow-sm px-4 py-2.5 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <ActiveIcon className="w-4 h-4 text-primary" />
                {active.label}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg" dir="rtl">
            {items.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeId;
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => onChange(tab.id)}
                  className={`flex items-center gap-2 text-sm cursor-pointer ${isActive ? 'text-primary font-semibold' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{tab.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
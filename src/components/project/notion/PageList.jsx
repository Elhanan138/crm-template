import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
 Plus, MoreHorizontal, Copy, FolderPlus, Trash2, GripVertical, ChevronDown, ChevronLeft,
} from 'lucide-react';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { buildTree } from '@/lib/pageTree';
import { docPreview } from '@/lib/notionDoc';

function PageItemRow({ page, depth, isActive, onClick, onMenu }) {
 return (
  <div
   className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'}`}
   style={{ paddingInlineStart: `${depth * 16 + 8}px` }}
   onClick={onClick}
  >
   <span className="text-base flex-shrink-0">{page.icon || '📄'}</span>
   <span className="text-sm font-medium truncate flex-1 min-w-0">{page.title || 'עמוד ללא שם'}</span>
   {page.content_text && !isActive && (
    <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[100px]">
     {docPreview(page.content_json || {}, 30)}
    </span>
   )}
   <DropdownMenu>
    <DropdownMenuTrigger asChild>
     <button
      onClick={(e) => e.stopPropagation()}
      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
     >
      <MoreHorizontal className="w-3.5 h-3.5"/>
     </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end"dir="rtl">
     <DropdownMenuItem onClick={() => onMenu('rename', page)}>
      <span className="text-sm">שנה שם</span>
     </DropdownMenuItem>
     <DropdownMenuItem onClick={() => onMenu('duplicate', page)}>
      <Copy className="w-3.5 h-3.5 ms-2"/>
      <span className="text-sm">שכפל</span>
     </DropdownMenuItem>
     <DropdownMenuItem onClick={() => onMenu('subpage', page)}>
      <FolderPlus className="w-3.5 h-3.5 ms-2"/>
      <span className="text-sm">הוסף עמוד לנושא</span>
     </DropdownMenuItem>
     <DropdownMenuSeparator />
     <DropdownMenuItem className="text-destructive"onClick={() => onMenu('delete', page)}>
      <Trash2 className="w-3.5 h-3.5 ms-2"/>
      <span className="text-sm">מחק / ארכיון</span>
     </DropdownMenuItem>
    </DropdownMenuContent>
   </DropdownMenu>
  </div>
 );
}

function SectionHeader({ section, isCollapsed, onToggle, onSelect, onMenu, onNewPageInSection, isActive }) {
 return (
  <div
   className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'}`}
   onClick={onSelect}
  >
   <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:bg-muted flex-shrink-0"
    title={isCollapsed ? 'הרחב' : 'כווץ'}
   >
    {isCollapsed ? <ChevronLeft className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
   </button>
   <span className="text-base flex-shrink-0">{section.icon || '📁'}</span>
   <span className="text-sm font-bold truncate flex-1 min-w-0">{section.title || 'נושא ללא שם'}</span>
   <button
    onClick={(e) => { e.stopPropagation(); onNewPageInSection(); }}
    className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
    title="הוסף עמוד לנושא"
   >
    <Plus className="w-3.5 h-3.5"/>
   </button>
   <DropdownMenu>
    <DropdownMenuTrigger asChild>
     <button
      onClick={(e) => e.stopPropagation()}
      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
     >
      <MoreHorizontal className="w-3.5 h-3.5"/>
     </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end"dir="rtl">
     <DropdownMenuItem onClick={() => onMenu('rename', section)}>
      <span className="text-sm">שנה שם נושא</span>
     </DropdownMenuItem>
     <DropdownMenuItem onClick={() => onMenu('duplicate', section)}>
      <Copy className="w-3.5 h-3.5 ms-2"/>
      <span className="text-sm">שכפל נושא</span>
     </DropdownMenuItem>
     <DropdownMenuItem onClick={() => onMenu('subpage', section)}>
      <FolderPlus className="w-3.5 h-3.5 ms-2"/>
      <span className="text-sm">הוסף עמוד לנושא</span>
     </DropdownMenuItem>
     <DropdownMenuSeparator />
     <DropdownMenuItem className="text-destructive"onClick={() => onMenu('delete', section)}>
      <Trash2 className="w-3.5 h-3.5 ms-2"/>
      <span className="text-sm">מחק נושא</span>
     </DropdownMenuItem>
    </DropdownMenuContent>
   </DropdownMenu>
  </div>
 );
}

function PageListContent({ pages, activePageId, onSelect, onMenu, onReorder, onNewSection, onNewPageInSection, filter, setFilter, archivedCount, projectId }) {
 const tree = useMemo(() => buildTree(pages), [pages]);
 const [collapsedSections, setCollapsedSections] = useState(() => {
  try {
   const saved = JSON.parse(localStorage.getItem(`pageListCollapsed_${projectId}`));
   return Array.isArray(saved) ? new Set(saved) : new Set();
  } catch { return new Set(); }
 });

 const toggleSection = (id) => {
  const next = new Set(collapsedSections);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setCollapsedSections(next);
  try { localStorage.setItem(`pageListCollapsed_${projectId}`, JSON.stringify([...next])); } catch { /* ignore */ }
 };

 const onDragEnd = (result) => {
  if (!result.destination) return;
  const { draggableId, destination } = result;
  onReorder(draggableId, destination.index);
 };

 return (
  <div className="flex flex-col h-full"dir="rtl">
   <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
    <span className="text-sm font-bold text-foreground">פתקים</span>
    <div className="flex items-center gap-1">
     {archivedCount > 0 && (
      <button
       onClick={() => setFilter(filter === 'archived' ? 'active' : 'archived')}
       className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
       {filter === 'archived' ? 'מוצגים' : `ארכיון (${archivedCount})`}
      </button>
     )}
     <Button variant="ghost"size="icon"className="h-8 w-8"aria-label="נושא חדש"onClick={onNewSection} title="נושא חדש">
      <Plus className="w-4 h-4"/>
     </Button>
    </div>
   </div>
   <div className="flex-1 overflow-y-auto p-2">
    {tree.length === 0 ? (
     <p className="text-xs text-muted-foreground text-center py-8">אין פתקים</p>
    ) : (
     <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="pages">
       {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-0.5">
         {tree.map((node, idx) => {
          const hasChildren = node.children.length > 0;
          const isCollapsed = collapsedSections.has(node.id);

          return (
           <Draggable key={node.id} draggableId={node.id} index={idx}>
            {(dragProvided) => (
             <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="flex items-center">
              <button
               {...dragProvided.dragHandleProps}
               className="w-4 h-8 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 cursor-grab"
               title="גרור"
              >
               <GripVertical className="w-3 h-3"/>
              </button>
              <div className="flex-1 min-w-0">
               {hasChildren ? (
                <>
                 <SectionHeader
                  section={node}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleSection(node.id)}
                  isActive={node.id === activePageId}
                  onSelect={() => onSelect(node.id)}
                  onMenu={onMenu}
                  onNewPageInSection={() => onNewPageInSection(node.id)}
                 />
                 {!isCollapsed && node.children.map(child => (
                  <PageItemRow
                   key={child.id}
                   page={child}
                   depth={1}
                   isActive={child.id === activePageId}
                   onClick={() => onSelect(child.id)}
                   onMenu={onMenu}
                  />
                 ))}
                </>
               ) : (
                <PageItemRow
                 page={node}
                 depth={0}
                 isActive={node.id === activePageId}
                 onClick={() => onSelect(node.id)}
                 onMenu={onMenu}
                />
               )}
              </div>
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
    )}
   </div>
  </div>
 );
}

export default function PageList({ pages, activePageId, onSelect, onMenu, onReorder, onNewSection, onNewPageInSection, isMobile, mobileOpen, onMobileClose, filter, setFilter, archivedCount, projectId }) {
 const activePages = pages.filter(p => !p.is_archived);
 const archivedPages = pages.filter(p => p.is_archived);
 const displayPages = filter === 'archived' ? archivedPages : activePages;

 if (isMobile) {
  return (
   <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
    <SheetContent side="right"dir="rtl"className="w-full sm:max-w-xs p-0">
     <SheetHeader className="px-3 py-2.5 border-b border-border text-right shrink-0">
      <SheetTitle className="text-sm font-bold">פתקי פרויקט</SheetTitle>
     </SheetHeader>
     <div className="flex-1 overflow-hidden">
      <PageListContent
       pages={displayPages}
       activePageId={activePageId}
       onSelect={(id) => { onSelect(id); onMobileClose?.(false); }}
       onMenu={onMenu}
       onReorder={onReorder}
       onNewSection={onNewSection}
       onNewPageInSection={onNewPageInSection}
       filter={filter}
       setFilter={setFilter}
       archivedCount={archivedCount}
       projectId={projectId}
      />
     </div>
    </SheetContent>
   </Sheet>
  );
 }

 return (
  <div className="w-56 flex-shrink-0 bg-card border border-border rounded-lg shadow-sm overflow-hidden h-fit sticky top-4">
   <PageListContent
    pages={displayPages}
    activePageId={activePageId}
    onSelect={onSelect}
    onMenu={onMenu}
    onReorder={onReorder}
    onNewSection={onNewSection}
    onNewPageInSection={onNewPageInSection}
    filter={filter}
    setFilter={setFilter}
    archivedCount={archivedCount}
    projectId={projectId}
   />
  </div>
 );
}
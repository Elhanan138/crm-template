import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderPlus, ChevronLeft, Search, User, LayoutGrid, List as ListIcon, GripVertical } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import EmptyState from '@/components/shared/EmptyState';
import CardSkeleton from '@/components/shared/CardSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import { useAccessControl } from '@/hooks/useAccessControl';
import { scoreMatch } from '@/lib/hebrewSearch';
import { applyUserOrder, reorder } from '@/lib/projectOrder';
import { filterScope } from '@/lib/projectScope';
import { getProjectPath } from '@/lib/projectSlug';

function ProjectCard({ project, dragHandleProps, isReordering }) {
 return (
  <Link
   to={getProjectPath(project)}
   onClick={(e) => { if (isReordering) e.preventDefault(); }}
   className="group bg-card rounded-lg border border-border p-4 sm:p-5 hover:shadow-md hover:border-primary/30 transition-all flex items-center gap-3 h-full"
  >
   {dragHandleProps && (
    <button {...dragHandleProps} onClick={(e) => e.preventDefault()} className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"title="גרור לשינוי סדר">
     <GripVertical className="w-4 h-4"/>
    </button>
   )}
   <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white border border-border shadow-sm p-2 flex-shrink-0 flex items-center justify-center"> {/* לוגו לקוח — לבן מכוון */}
    {project.image_url ? (
     <img src={project.image_url} alt={project.client_name || project.name} className="w-full h-full object-contain"/>
    ) : (
     <CubeIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary"/>
    )}
   </div>
   <div className="flex flex-col gap-1.5 min-w-0 flex-1">
    <h3 className="text-section-title text-foreground font-bold truncate">{project.client_name || project.name}</h3>
    {project.project_manager && (
     <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground truncate">
      <User className="w-3.5 h-3.5 flex-shrink-0"/>{project.project_manager}
     </span>
    )}
   </div>
  </Link>
 );
}

function ProjectRow({ project, dragHandleProps, isReordering }) {
 return (
  <Link
   to={getProjectPath(project)}
   onClick={(e) => { if (isReordering) e.preventDefault(); }}
   className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors group bg-card"
  >
   <div className="flex items-center gap-4 min-w-0">
    {dragHandleProps && (
     <button {...dragHandleProps} onClick={(e) => e.preventDefault()} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"title="גרור לשינוי סדר">
      <GripVertical className="w-4 h-4"/>
     </button>
    )}
    {project.image_url ? (
     <img src={project.image_url} alt={project.client_name || project.name} className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0"/>
    ) : (
     <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
      <CubeIcon className="w-4 h-4 text-primary"/>
     </div>
    )}
    <div className="min-w-0 text-right">
     <h3 className="text-sm font-semibold text-foreground truncate">{project.client_name || project.name}</h3>
     <p className="text-xs text-muted-foreground mt-0.5">{project.contract_value ? `₪${Number(project.contract_value).toLocaleString()}` : ''}</p>
    </div>
   </div>
   <ChevronLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"/>
  </Link>
 );
}

export default function Projects() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');

  const { isRealAdmin, canViewProject, isLoading: aclLoading, currentUser, effectiveUser, updateUser } = useAccessControl();
  const canCreateProject = true;

  const { data: allProjects = [], isLoading } = useQuery({
   queryKey: ['projects'],
   queryFn: () => api.entities.Project.list('-created_date'),
  });

  const visibleProjects = isRealAdmin ? allProjects : allProjects.filter(p => canViewProject(p.id));

  const scope = currentUser?.ui_prefs?.projects_scope || (isRealAdmin ? 'mine' : 'all');
  const identity = {
   myName: effectiveUser?.full_name || '',
   myEmail: effectiveUser?.email || currentUser?.email || '',
   myUserId: currentUser?.id || '',
  };
  const scopedProjects = filterScope(visibleProjects, scope, identity);

  const handleScopeChange = (newScope) => {
   if (newScope === scope) return;
   const uiPrefs = { ...(currentUser?.ui_prefs || {}), projects_scope: newScope };
   updateUser({ ui_prefs: uiPrefs });
   api.auth.updateMe({ ui_prefs: uiPrefs });
  };

  // Derived, not stored. As state fed by an effect this looped forever:
  // `scopedProjects` is rebuilt on every render, so the effect saw a new
  // dependency every time, set state, and re-rendered — thousands of times a
  // second behind a page that looked fine.
  const ordered = useMemo(
   () => applyUserOrder(scopedProjects, currentUser?.project_order),
   [allProjects, scope, isRealAdmin, identity.myName, identity.myEmail, identity.myUserId, currentUser?.project_order]
  );

  const isSearching = !!search.trim();
  const filteredProjects = isSearching
   ? ordered
     .map(p => ({
      p,
      score: scoreMatch(
       search,
       [p.client_name, p.name],
       (p.tags || []).join(' '),
       p.project_manager,
       p.current_liaison,
      ),
     }))
     .filter(x => x.score > 0)
     .sort((a, b) => b.score - a.score || (a.p.order ?? 0) - (b.p.order ?? 0))
     .map(x => x.p)
   : ordered;
  // Drag is only enabled when not searching (full ordered list shown)
  const canReorder = !isSearching;

  const handleDragEnd = async (result) => {
   if (!result.destination || result.source.index === result.destination.index) return;
   const ids = ordered.map(p => p.id);
   const newOrder = reorder(ids, result.source.index, result.destination.index);
   updateUser({ project_order: newOrder });
   try {
    await api.auth.updateMe({ project_order: newOrder });
   } catch (e) {
    toast.error(e?.message || 'שמירת סדר הפרויקטים נכשלה');
   }
  };

  if (isLoading || aclLoading) {
   return (
    <div>
     <PageHeader icon={CubeIcon} title="פרויקטים"subtitle="טוען פרויקטים..."/>
     <CardSkeleton count={6} />
    </div>
   );
  }

  return (
   <div>
    {/* Header */}
    <PageHeader
     icon={CubeIcon}
     title="פרויקטים"
     subtitle={scope === 'mine' ? `${scopedProjects.length} מתוך ${visibleProjects.length} פרויקטים` : `${visibleProjects.length} פרויקטים במערכת`}
     actions={canCreateProject && (
      <Link to="/projects/new">
       <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-10 text-sm font-semibold shadow-none gap-2">
        <FolderPlus className="w-4 h-4"/> פרויקט חדש
       </Button>
      </Link>
     )}
    />

    {/* Controls */}
    <div className="flex items-center gap-2 flex-wrap mb-5">
     <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם לקוח..."className="h-10 rounded-full text-sm pe-9"/>
     </div>
     <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1">
      <button onClick={() => setView('grid')} className={`h-8 w-8 flex items-center justify-center rounded-full transition-all ${view === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
       <LayoutGrid className="w-4 h-4"/>
      </button>
      <button onClick={() => setView('list')} className={`h-8 w-8 flex items-center justify-center rounded-full transition-all ${view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
       <ListIcon className="w-4 h-4"/>
      </button>
     </div>
     <ToggleGroup
      type="single"
      value={scope}
      onValueChange={(v) => v && handleScopeChange(v)}
      className="bg-muted/60 rounded-full p-1"
     >
      <ToggleGroupItem
       value="mine"
       className="h-8 px-4 rounded-full text-xs font-medium data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground"
      >
       שלי
      </ToggleGroupItem>
      <ToggleGroupItem
       value="all"
       className="h-8 px-4 rounded-full text-xs font-medium data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground"
      >
       הכל
      </ToggleGroupItem>
     </ToggleGroup>
    </div>

    {isSearching && (
     <p className="text-xs text-muted-foreground mb-3">נמצאו {filteredProjects.length} פרויקטים</p>
    )}

    {canReorder && filteredProjects.length > 1 && (
     <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
      <GripVertical className="w-3 h-3"/> גרור פרויקטים כדי לשנות את סדר התצוגה
     </p>
    )}

    {/* Content */}
    {scopedProjects.length === 0 ? (
     <EmptyState
      icon={CubeIcon}
      title="אין פרויקטים עדיין"
      description={canCreateProject ? "צור את הפרויקט הראשון שלך כדי להתחיל.": "אין לך עדיין גישה לפרויקטים. פנה למנהל המערכת."}
      action={canCreateProject ? (
       <Link to="/projects/new">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-9 text-sm font-semibold shadow-none">צור פרויקט</Button>
       </Link>
      ) : null}
     />
    ) : filteredProjects.length === 0 ? (
     <div className="text-center py-16 text-sm text-muted-foreground bg-card rounded-lg border border-border">לא נמצאו פרויקטים התואמים לחיפוש.</div>
    ) : (
     <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="projects"direction={view === 'grid' ? 'vertical' : 'vertical'} isDropDisabled={!canReorder}>
       {(provided) => (
        view === 'grid' ? (
         <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p, index) => (
           <Draggable key={p.id} draggableId={p.id} index={index} isDragDisabled={!canReorder}>
            {(prov, snapshot) => (
             <div ref={prov.innerRef} {...prov.draggableProps} className={snapshot.isDragging ? 'opacity-90 z-50' : ''}>
              <ProjectCard project={p} dragHandleProps={canReorder ? prov.dragHandleProps : null} isReordering={snapshot.isDragging} />
             </div>
            )}
           </Draggable>
          ))}
          {provided.placeholder}
         </div>
        ) : (
         <div ref={provided.innerRef} {...provided.droppableProps} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm divide-y divide-border">
          {filteredProjects.map((p, index) => (
           <Draggable key={p.id} draggableId={p.id} index={index} isDragDisabled={!canReorder}>
            {(prov, snapshot) => (
             <div ref={prov.innerRef} {...prov.draggableProps} className={snapshot.isDragging ? 'opacity-90 shadow-lg z-50' : ''}>
              <ProjectRow project={p} dragHandleProps={canReorder ? prov.dragHandleProps : null} isReordering={snapshot.isDragging} />
             </div>
            )}
           </Draggable>
          ))}
          {provided.placeholder}
         </div>
        )
       )}
      </Droppable>
     </DragDropContext>
    )}
   </div>
  );
}
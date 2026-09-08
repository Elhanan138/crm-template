import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { getProjectPath } from '@/lib/projectSlug';
import WidgetShell from './WidgetShell';

const MAX = 4;

function ProjectChip({ p }) {
 return (
  <Link
   to={getProjectPath(p)}
   className="group/chip flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3 hover:border-primary/40 hover:bg-accent/40 hover:shadow-md transition-all"
  >
   <div className="w-11 h-11 rounded-lg overflow-hidden bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
    {p.image_url ? (
     <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/>
    ) : (
     <span className="text-base font-bold text-primary">{(p.client_name || p.name || '?')[0]}</span>
    )}
   </div>
   <div className="min-w-0 flex-1">
    <p className="text-sm font-semibold text-foreground truncate group-hover/chip:text-primary transition-colors">{p.client_name || p.name}</p>
    <p className="text-[11px] text-muted-foreground truncate">{p.name}</p>
   </div>
  </Link>
 );
}

// Project picking moved to the dashboard customizer (gear icon on the home page).
export default function QuickAccessWidget({ projects, pinnedIds = [] }) {
 const byId = Object.fromEntries(projects.map(p => [p.id, p]));
 const pinned = pinnedIds.map(id => byId[id]).filter(Boolean);
 const display = (pinned.length > 0 ? pinned : projects.slice(0, MAX)).slice(0, MAX);

 return (
  <WidgetShell
   title="גישה מהירה לפרויקטים"
   subtitle={`עד ${MAX} פרויקטים נבחרים`}
   icon={CubeIcon}
  >
   {display.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-6 text-center">
     <p className="text-sm text-muted-foreground mb-3">עדיין אין פרויקטים</p>
     <Link to="/projects/new"><Button className="rounded-full gap-1.5 bg-primary hover:bg-primary/90"><Plus className="w-4 h-4"/> פרויקט חדש</Button></Link>
    </div>
   ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
     {display.map(p => <ProjectChip key={p.id} p={p} />)}
    </div>
   )}
  </WidgetShell>
 );
}
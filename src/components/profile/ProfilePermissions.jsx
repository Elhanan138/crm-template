import { Shield, CheckCircle2, Lock } from 'lucide-react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export default function ProfilePermissions() {
 const { effectiveUser, teamMember, isRealAdmin, projectPerms, hasProject } = useAccessControl();

 const myEmail = effectiveUser?.email || '';

 const { data: projects = [] } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.entities.Project.list(),
 });

 // Projects where this user has any permission record OR is PM/liaison/creator
 const myProjects = projects.filter(p => hasProject(p.id));
 const projectMap = {};
 projects.forEach(p => { projectMap[p.id] = p.client_name || p.name; });

 if (isRealAdmin) {
  return (
   <div className="space-y-3">
    <div className="bg-card rounded-lg border border-border shadow-sm p-5">
     <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
       <Shield className="w-5 h-5 text-primary"/>
      </div>
      <div>
       <h3 className="text-sm font-bold text-foreground">גישת אדמין מלאה</h3>
       <p className="text-[11px] text-muted-foreground">לכל הפרויקטים והמודולים במערכת</p>
      </div>
     </div>
     <div className="flex items-center gap-2 text-xs text-accent-foreground font-medium bg-accent rounded-lg px-3 py-2">
      <CheckCircle2 className="w-3.5 h-3.5"/> {projects.length === 0 ? 'אין עדיין פרויקטים במערכת' : <>יש לך גישה מלאה לכל {projects.length} הפרויקטים</>}
     </div>
    </div>
   </div>
  );
 }

 return (
  <div className="space-y-3">
   <div className="bg-card rounded-lg border border-border shadow-sm p-5">
    <div className="flex items-center gap-3 mb-3">
     <div className="w-10 h-10 rounded-lg bg-info-muted flex items-center justify-center">
      <Lock className="w-5 h-5 text-info"/>
     </div>
     <div>
      <h3 className="text-sm font-bold text-foreground">הרשאות פרויקט</h3>
      <p className="text-[11px] text-muted-foreground">יש לך גישה מלאה לפרויקטים המסומנים</p>
     </div>
    </div>

    {myProjects.length === 0 ? (
     <p className="text-xs text-muted-foreground text-center py-6">אין לך כרגע גישה לפרויקטים. פנה למנהל המערכת לקבלת גישה.</p>
    ) : (
     <div className="space-y-2">
      {myProjects.map(p => (
       <div key={p.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-foreground">{p.client_name || p.name}</p>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success-muted text-success flex items-center gap-1">
         <CheckCircle2 className="w-3 h-3"/>
         גישה מלאה
        </span>
       </div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
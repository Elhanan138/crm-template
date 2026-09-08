import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, ChevronDown, ShieldCheck, Search, RefreshCw } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';
import { cleanEmail as clean } from '@/lib/permissions';

/* One member's access row — binary: either has access or doesn't */
function MemberAccessRow({ member, projectId, hasAccess }) {
 const queryClient = useQueryClient();
 const [saving, setSaving] = useState(false);

 const toggle = async () => {
  setSaving(true);
  try {
   await api.functions.invoke('setProjectMembers', {
    projectId,
    memberEmail: clean(member.email),
    grant: !hasAccess,
   });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions', projectId] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   toast.success(hasAccess ? 'הגישה הוסרה' : 'הגישה הוענקה', { duration: 2000 });
  } catch (err) {
   const status = err?.response?.status;
   if (status === 403) {
    toast.error('אין לך הרשאה לפעולה זו');
   } else if (status === 422) {
    toast.error(err?.response?.data?.error || 'המשתמש אינו קיים במערכת');
   } else {
    toast.error('שגיאה בשמירה');
   }
  }
  setSaving(false);
 };

 return (
  <div className="border border-border/70 rounded-lg p-3">
   <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2.5 min-w-0">
     <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-primary">{member.name?.[0] || '?'}</span>
     </div>
     <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
       {member.name}
       {saving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground"/>}
      </p>
      {member.email && <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>}
     </div>
    </div>
    <button
     type="button"
     onClick={toggle}
     disabled={saving}
     className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all flex-shrink-0 disabled:opacity-50 ${
      hasAccess
       ? 'bg-primary text-primary-foreground border-primary'
       : 'bg-card text-muted-foreground border-border hover:border-primary/40'
     }`}
    >
     <ShieldCheck className="w-3 h-3"/>
     {hasAccess ? 'גישה מלאה' : 'ללא גישה'}
    </button>
   </div>
  </div>
 );
}

/* A single expandable project block */
function ProjectBlock({ project, members, projPerms }) {
 const [open, setOpen] = useState(false);
 const grants = projPerms.filter(pp => pp.project_id === project.id && (pp.permissions || []).length);
 const grantedEmails = new Set(grants.map(g => clean(g.member_email)));
 const grantedNames = grants
  .map(g => members.find(m => clean(m.email) === clean(g.member_email))?.name || g.member_email);

 return (
  <div className="rounded-lg border border-border/70 overflow-hidden">
   <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between gap-3 w-full px-3.5 py-3 hover:bg-muted/30 transition-colors text-right">
    <div className="flex items-center gap-2.5 min-w-0">
     {project.image_url ? (
      <img src={project.image_url} alt=""className="w-8 h-8 rounded-lg object-cover border border-border flex-shrink-0"/>
     ) : (
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
       <CubeIcon className="w-4 h-4 text-primary"/>
      </div>
     )}
     <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">{project.client_name || project.name}</p>
      <p className="text-[11px] text-muted-foreground truncate">
       {grantedNames.length ? grantedNames.join(', ') : 'רק יוצר הפרויקט והאדמינים'}
      </p>
     </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
     <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${grants.length ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
      {grants.length ? `${grants.length} משתמשים` : 'ברירת מחדל'}
     </span>
     <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
    </div>
   </button>
   {open && (
    <div className="p-3 pt-0 space-y-2 bg-muted/10">
     {members.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">אין חברי צוות.</p>
     ) : (
      members.map(m => (
       <MemberAccessRow
        key={m.id}
        member={m}
        projectId={project.id}
        hasAccess={grantedEmails.has(clean(m.email))}
       />
      ))
     )}
    </div>
   )}
  </div>
 );
}

export default function ProjectAccessManager({ members }) {
 const queryClient = useQueryClient();
 const [search, setSearch] = useState('');
 const [syncDialog, setSyncDialog] = useState(false);
 const { data: projects = [], isLoading: lp } = useQuery({ queryKey: ['projects'], queryFn: () => api.entities.Project.list('-created_date') });
 const { data: projPerms = [], isLoading: lpp } = useQuery({ queryKey: ['projectPermissions'], queryFn: () => api.entities.ProjectPermission.list() });

 const syncMutation = useMutation({
  mutationFn: () => api.functions.invoke('syncPermissions', {}),
  onSuccess: (res) => {
   const data = res?.data || res;
   toast.success(`סונכרנו ${data?.projectsSynced || 0} פרויקטים ו-${data?.childRecordsSynced || 0} רשומות`);
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
  },
  onError: () => toast.error('הסנכרון נכשל'),
 });

 const filtered = projects.filter(p =>
  !search.trim() || (p.client_name || p.name || '').toLowerCase().includes(search.toLowerCase())
 );

 return (
  <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
   <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
    <div className="flex items-center gap-2.5">
     <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center"><CubeIcon className="w-[18px] h-[18px] text-primary"/></div>
     <div>
      <h3 className="text-sm font-bold text-foreground">גישה לפי פרויקט</h3>
      <p className="text-[11px] text-muted-foreground">לחץ על פרויקט כדי להעניק או להסיר גישה מלאה</p>
     </div>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
     <div className="relative flex-1 sm:w-56">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש פרויקט..."className="h-9 pe-9 rounded-full text-sm"/>
     </div>
     <Button
      variant="outline"
      onClick={() => setSyncDialog(true)}
      disabled={syncMutation.isPending}
      className="rounded-full h-9 px-4 text-sm gap-1.5 flex-shrink-0"
     >
      {syncMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <RefreshCw className="w-3.5 h-3.5"/>}
      <span className="hidden sm:inline">סנכרן הרשאות</span>
     </Button>
    </div>
   </div>

   {lp || lpp ? (
    <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/></div>
   ) : filtered.length === 0 ? (
    <p className="text-sm text-muted-foreground text-center py-8">אין פרויקטים.</p>
   ) : (
    <div className="space-y-2">
     {filtered.map(p => (
      <ProjectBlock key={p.id} project={p} members={members} projPerms={projPerms} />
     ))}
    </div>
   )}

   <AlertDialog open={syncDialog} onOpenChange={setSyncDialog}>
    <AlertDialogContent className="rounded-lg"dir="rtl">
     <AlertDialogHeader>
      <AlertDialogTitle className="">סנכרון הרשאות מחדש</AlertDialogTitle>
      <AlertDialogDescription>הפעולה תבנה מחדש את כל מערכי ההרשאות בכל הפרויקטים והרשומות מתוך רשומות ההרשאה הנוכחיות. להמשיך?</AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter className="flex-row-reverse gap-2">
      <AlertDialogCancel className="rounded-full mt-0">ביטול</AlertDialogCancel>
      <AlertDialogAction className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"onClick={() => { setSyncDialog(false); syncMutation.mutate(); }}>סנכרן</AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </div>
 );
}
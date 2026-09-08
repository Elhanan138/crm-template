import React, { useMemo, useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Users, UserCog, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cleanEmail as clean } from '@/lib/permissions';
import AddMemberCombobox from '@/components/project/permissions/AddMemberCombobox';
import AccessMemberRow from '@/components/project/permissions/AccessMemberRow';
import AdminsSection from '@/components/project/permissions/AdminsSection';

function errMsg(err, fallback) {
 const status = err?.response?.status;
 const msg = err?.response?.data?.error;
 if (status === 403) return 'אין לך הרשאה לפעולה זו';
 if (status === 422) return msg || 'המשתמש אינו קיים במערכת';
 return msg || fallback;
}

export default function ProjectPermissionsDialog({ projectId, projectName, project, teamMembers = [], open, onClose, canManage, canTransferOwnership }) {
 const queryClient = useQueryClient();

 // Ownership state
 const [newPm, setNewPm] = useState('');
 const [newLiaison, setNewLiaison] = useState('');
 const [transferring, setTransferring] = useState(false);

 useEffect(() => {
  if (open && project) {
   setNewPm(project.project_manager || '');
   setNewLiaison(project.current_liaison || '');
  }
 }, [open, project]);

 const oldPm = project?.project_manager || '';
 const oldLiaison = project?.current_liaison || '';
 const pmChanged = newPm !== oldPm;
 const liaisonChanged = newLiaison !== oldLiaison;
 const hasOwnershipChange = pmChanged || liaisonChanged;

 const handleTransferOwnership = async () => {
  if (!hasOwnershipChange) return;
  setTransferring(true);
  try {
   await api.functions.invoke('transferProjectOwnership', {
    projectId,
    newProjectManager: pmChanged ? newPm : undefined,
    newLiaison: liaisonChanged ? newLiaison : undefined,
   });
   queryClient.invalidateQueries({ queryKey: ['project', projectId] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissionsAll', projectId] });
   toast.success('הבעלות הועברה בהצלחה');
  } catch (err) {
   toast.error('העברת הבעלות נכשלה: ' + (err?.message || ''));
  } finally {
   setTransferring(false);
  }
 };

 const { data: members = [], isLoading: lm } = useQuery({
  queryKey: ['teamMembersAll'],
  queryFn: async () => {
   const res = await api.functions.invoke('listTeamMembers');
   return res.data || [];
  },
  enabled: open,
 });

 const { data: perms = [], isLoading: lp } = useQuery({
  queryKey: ['projectPermissionsAll', projectId],
  queryFn: async () => {
   const res = await api.functions.invoke('listProjectPermissions', { projectId });
   return res.data || [];
  },
  enabled: open && !!projectId,
 });

 const loading = lm || lp;

 // Members with any permission record = has access
 const withAccess = useMemo(() => {
  const permEmails = new Set(
   perms
    .filter(p => (p.permissions || []).length > 0)
    .map(p => clean(p.member_email))
  );
  return members.filter(m => !m.is_admin && permEmails.has(clean(m.email)));
 }, [members, perms]);

 const admins = useMemo(
  () => members.filter(m => m.is_admin === true),
  [members]
 );

 const excludedEmails = useMemo(
  () => [...withAccess.map(m => m.email), ...admins.map(m => m.email)],
  [withAccess, admins]
 );

 const handleAdd = async (member) => {
  try {
   await api.functions.invoke('setProjectMembers', {
    projectId,
    memberEmail: (member.email || '').trim(),
    grant: true,
   });
   queryClient.invalidateQueries({ queryKey: ['projectPermissionsAll'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissionsAll', projectId] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   toast.success(`✓ ${member.name} קיבל/ה גישה מלאה לפרויקט`, { duration: 3000 });
  } catch (err) {
   const msg = errMsg(err, 'הוספת גישה נכשלה');
   toast.error(`✗ ${msg}`, { duration: 4000 });
  }
 };

 return (
  <Dialog open={open} onOpenChange={o => !o && onClose()}>
   <DialogContent className="sm:max-w-lg rounded-lg max-h-[85vh] overflow-hidden flex flex-col"dir="rtl">
    <DialogHeader>
     <DialogTitle className="text-base font-bold text-right flex items-center gap-2">
      <Users className="w-4 h-4 text-primary"/>
      הרשאות ובעלות: {projectName}
     </DialogTitle>
    </DialogHeader>

    {/* Ownership section */}
    {canTransferOwnership && (
     <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-1.5">
       <UserCog className="w-3.5 h-3.5 text-primary"/>
       <span className="text-xs font-semibold text-foreground">בעלות ואחריות</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
       <div>
        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">מנהל פרויקט</label>
        <Select value={newPm} onValueChange={setNewPm}>
         <SelectTrigger className="w-full rounded-lg h-9 text-sm"><SelectValue placeholder="בחר מנהל פרויקט"/></SelectTrigger>
         <SelectContent dir="rtl">
          {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
         </SelectContent>
        </Select>
       </div>
       <div>
        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">מלווה</label>
        <Select value={newLiaison} onValueChange={setNewLiaison}>
         <SelectTrigger className="w-full rounded-lg h-9 text-sm"><SelectValue placeholder="בחר מלווה"/></SelectTrigger>
         <SelectContent dir="rtl">
          {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
         </SelectContent>
        </Select>
       </div>
      </div>
      {hasOwnershipChange && (
       <div className="rounded-lg bg-info-muted p-2.5 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-info flex-shrink-0 mt-0.5"/>
        <div className="text-[11px] text-info space-y-0.5">
         {pmChanged && <p>מנהל פרויקט: <strong>{oldPm || '—'}</strong> ← <strong>{newPm}</strong></p>}
         {liaisonChanged && <p>מלווה: <strong>{oldLiaison || '—'}</strong> ← <strong>{newLiaison}</strong></p>}
         <p className="pt-0.5 border-t border-info/20">ה-PM/המלווה היוצאים נשארים עם גישה מלאה — ניתן להסירה ברשימה למטה.</p>
        </div>
       </div>
      )}
      {hasOwnershipChange && (
       <div className="flex justify-start">
        <button
         onClick={handleTransferOwnership}
         disabled={!hasOwnershipChange || transferring}
         className="rounded-full h-8 px-4 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
         {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <UserCog className="w-3.5 h-3.5"/>}
         אשר העברה
        </button>
       </div>
      )}
     </div>
    )}

    {/* Team access section */}
    {canManage && (
     <AddMemberCombobox
      members={members}
      excludedEmails={excludedEmails}
      onAdd={handleAdd}
     />
    )}

    {!canManage && (
     <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-caption">
      <Info className="w-3.5 h-3.5 flex-shrink-0"/>
      <span>ניהול גישות זמין למנהל הפרויקט ולמלווה</span>
     </div>
    )}

    {/* Access list */}
    <div className="flex-1 overflow-y-auto pe-1">
     {loading ? (
      <div className="flex items-center justify-center py-10">
       <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>
      </div>
     ) : withAccess.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-center">
       <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
        <Users className="w-4 h-4 text-muted-foreground"/>
       </div>
       <p className="text-sm font-medium text-foreground mb-1">רק אדמינים רואים את הפרויקט כרגע</p>
       <p className="text-caption">{canManage ? 'הוסף חברי צוות למעלה כדי לשתף את הפרויקט' : 'פנה למנהל הפרויקט להוספת חברי צוות'}</p>
      </div>
     ) : (
      <div className="space-y-1.5">
       <p className="text-xs font-semibold text-muted-foreground px-1">
        יש להם גישה מלאה ({withAccess.length})
       </p>
       {withAccess.map(m => (
        <div key={m.id} className="animate-slide-in">
         <AccessMemberRow
          member={m}
          projectId={projectId}
          readOnly={!canManage}
         />
        </div>
       ))}
      </div>
     )}
    </div>

    {/* Admins section — collapsed, informational */}
    {!loading && admins.length > 0 && (
     <div className="border-t border-border pt-1.5">
      <AdminsSection admins={admins} />
     </div>
    )}

    {/* Close button */}
    <div className="flex justify-start pt-2 border-t border-border">
     <button
      onClick={onClose}
      className="rounded-full h-9 px-5 text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
     >
      סגור
     </button>
    </div>
   </DialogContent>
  </Dialog>
 );
}
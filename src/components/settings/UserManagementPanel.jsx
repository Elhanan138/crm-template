import React, { useState } from 'react';
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Users, ShieldCheck, Search, Info, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  makeCredentials, CLEARED_CREDENTIALS, validateUsername, validatePassword, passwordStrength,
} from '@/lib/credentials';

import { CubeIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';
import { cleanEmail } from '@/lib/permissions';
import ProjectAccessManager from '@/components/settings/ProjectAccessManager';

import EmptyState from '@/components/shared/EmptyState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import UserRow from '@/components/settings/UserRow';

export default function UserManagementPanel() {
 const queryClient = useQueryClient();
 const [dialog, setDialog] = useState({ open: false, member: null });
 const [deleteDialog, setDeleteDialog] = useState({ open: false, member: null });
 const [search, setSearch] = useState('');

 const { data: members = [], isLoading } = useQuery({
  queryKey: ['teamMembers'],
  queryFn: () => api.entities.TeamMember.list('name'),
 });

 const deleteMutation = useMutation({
  mutationFn: (memberId) => api.functions.invoke('manageTeamMember', { action: 'delete', memberId }),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   queryClient.invalidateQueries({ queryKey: ['currentUser'] });
   setDeleteDialog({ open: false, member: null });
   toast.success('חבר הוסר — הגישה לכל הפרויקטים הוסרה');
  },
  onError: (err) => {
   const msg = err?.response?.data?.error || err?.data?.error || 'המחיקה נכשלה';
   toast.error(msg);
   setDeleteDialog({ open: false, member: null });
  },
 });

 const updateMutation = useMutation({
  mutationFn: ({ id, data }) => api.functions.invoke('manageTeamMember', { action: 'update', memberId: id, data }),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  },
  onError: (err) => {
   const msg = err?.response?.data?.error || err?.data?.error || 'העדכון נכשל';
   toast.error(msg);
  },
 });

 const filtered = members.filter(m =>
  !search.trim() ||
  (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
  (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
  (m.role || '').toLowerCase().includes(search.toLowerCase())
 );

 const closeDialog = () => setDialog({ open: false, member: null });

 return (
  <div dir="rtl"className="space-y-5">
   {/* Section 1: Team Members Table */}
   <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
     <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-accent-foreground"/>
      </div>
      <div>
       <h2 className="text-section-title text-foreground">משתמשים והרשאות</h2>
       <p className="text-caption">{members.length} חברי צוות במערכת — לחץ על שורה לעריכה</p>
      </div>
     </div>
     <div className="flex items-center gap-2">
      <div className="relative flex-1 sm:w-48">
       <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
       <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש..."className="h-9 pe-9 rounded-full text-sm"/>
      </div>
      <Button type="button"onClick={() => setDialog({ open: true, member: null })} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm shadow-none gap-1.5 flex-shrink-0">
       <Plus className="w-4 h-4"/> <span className="hidden sm:inline">הוסף חבר</span>
      </Button>
     </div>
    </div>

    {isLoading ? (
     <div className="p-5"><ListSkeleton count={5} /></div>
    ) : filtered.length === 0 ? (
     <EmptyState
      icon={Users}
      title={search ? 'לא נמצאו תוצאות' : 'אין חברי צוות עדיין'}
      description={search ? 'נסה לחפש בשם, אימייל או תפקיד אחר' : 'הוסף את חבר הצוות הראשון כדי להתחיל'}
      action={!search ? (
       <Button type="button"onClick={() => setDialog({ open: true, member: null })} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm gap-2">
        <Plus className="w-4 h-4"/> הוסף חבר
       </Button>
      ) : undefined}
     />
    ) : (
     <>
      {/* Table header — desktop */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_auto_auto] gap-4 px-4 py-2 bg-muted/20 border-b border-border text-[11px] font-semibold text-muted-foreground">
       <div>חבר צוות</div>
       <div className="text-right">תפקיד</div>
       <div>הרשאה</div>
       <div />
      </div>
      {/* Rows */}
      <div className="divide-y divide-border">
       {filtered.map((member) => (
        <UserRow
          key={member.id}
          member={member}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
          onEdit={(m) => setDialog({ open: true, member: m })}
          onDelete={(m) => setDeleteDialog({ open: true, member: m })}
        />
       ))}
      </div>
     </>
    )}

    {/* Info note */}
    <div className="flex items-start gap-2 px-4 py-3 bg-muted/30 border-t border-border text-[11px] text-muted-foreground">
     <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>
     <p>יש שני סוגי הרשאות בלבד: אדמין (גישה מלאה לכל המערכת) או הרשאות פר פרויקט, שנשלטות בחלק התחתון. יוצר הפרויקט שומר על גישה מלאה אליו.</p>
    </div>
   </div>

   {/* Section 2: Project Access */}
   <ProjectAccessManager members={members} />

   {/* Edit / Create Drawer */}
   <Sheet open={dialog.open} onOpenChange={(open) => { if (!open) closeDialog(); }}>
    <SheetContent side="left"dir="rtl"className="w-full sm:max-w-md overflow-y-auto p-0">
     <MemberEditDrawer
      member={dialog.member}
      members={members}
      onClose={closeDialog}
      onDelete={(m) => { closeDialog(); setDeleteDialog({ open: true, member: m }); }}
     />
    </SheetContent>
   </Sheet>

   {/* Delete confirmation */}
   <DeleteDialog
    open={deleteDialog.open}
    onOpenChange={(open) => { if (!open) setDeleteDialog({ open: false, member: null }); }}
    onConfirm={() => deleteMutation.mutate(deleteDialog.member?.id)}
    title="הסרת חבר צוות"
    confirmLabel="הסר"
    description={`האם להסיר את "${deleteDialog.member?.name}"? הגישה לכל הפרויקטים תוסר מיד.`}
   />
  </div>
 );
}

function MemberEditDrawer({ member, members = [], onClose, onDelete }) {
 const queryClient = useQueryClient();
 const [name, setName] = useState(member?.name || '');
 const [email, setEmail] = useState(member?.email || '');
 const [role, setRole] = useState(member?.role || '');
 const [isAdmin, setIsAdmin] = useState(!!member?.is_admin);
 const [adminConfirm, setAdminConfirm] = useState(false);
 const [managerEmail, setManagerEmail] = useState(member?.manager_email || '');
 const [username, setUsername] = useState(member?.username || '');
 const [password, setPassword] = useState('');
 const [passwordConfirm, setPasswordConfirm] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [clearCredentials, setClearCredentials] = useState(false);
 const hasPassword = !!member?.password_hash;
 const strength = passwordStrength(password);
 const isOwner = cleanEmail(member?.email) === '__owner__';
 const wasAdmin = !!member?.is_admin;

 const createMutation = useMutation({
  mutationFn: (data) => api.functions.invoke('manageTeamMember', { action: 'create', data }),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
   queryClient.invalidateQueries({ queryKey: ['currentUser'] });
   toast.success('חבר נוסף');
   onClose();
  },
  onError: (err) => {
   const msg = err?.response?.data?.error || 'ההוספה נכשלה';
   toast.error(msg);
  },
 });
 const updateMutation = useMutation({
  mutationFn: (data) => api.functions.invoke('manageTeamMember', { action: 'update', memberId: member.id, data }),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
   queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
   queryClient.invalidateQueries({ queryKey: ['projects'] });
   queryClient.invalidateQueries({ queryKey: ['currentUser'] });
   toast.success('עודכן');
   onClose();
  },
  onError: (err) => {
   const msg = err?.response?.data?.error || 'העדכון נכשל';
   toast.error(msg);
  },
 });

 const handleSelectAdmin = () => {
  if (isAdmin) return; // already selected
  if (wasAdmin) {
   // Was admin before — no need for confirmation (toggling back on)
   setIsAdmin(true);
  } else {
   // Turning on — show confirmation dialog
   setAdminConfirm(true);
  }
 };

 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!name.trim()) { toast.error('שם חובה'); return; }

  const usernameError = validateUsername(username, members, member?.id);
  if (usernameError) { toast.error(usernameError); return; }
  const passwordError = validatePassword(password, passwordConfirm);
  if (passwordError) { toast.error(passwordError); return; }

  const data = {
   name, email, role, is_admin: isAdmin, manager_email: managerEmail,
   username: username.trim(),
  };

  // Only the salted digest is ever persisted — the clear-text password never
  // leaves this handler.
  if (password) Object.assign(data, await makeCredentials(password));
  else if (clearCredentials) Object.assign(data, CLEARED_CREDENTIALS);

  if (member) updateMutation.mutate(data); else createMutation.mutate(data);
 };
 const busy = createMutation.isPending || updateMutation.isPending;

 return (
  <>
   <SheetHeader className="px-6 py-5 border-b border-border text-right">
    <SheetTitle className="text-base font-bold leading-tight">{member ? 'עריכת חבר צוות' : 'הוספת חבר צוות'}</SheetTitle>
   </SheetHeader>
   <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">שם מלא *</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא"className="h-9 rounded-lg"autoFocus />
     </div>
     <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">אימייל</Label>
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com"className="h-9 rounded-lg"dir="ltr"/>
     </div>
    </div>
    <div className="space-y-1.5">
     <Label className="text-xs font-medium text-muted-foreground">תפקיד</Label>
     <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="מנהל פרויקט, מפתח..."className="h-9 rounded-lg"/>
    </div>

    <div className="space-y-1.5">
     <Label className="text-xs font-medium text-muted-foreground">מנהלת צוות</Label>
     <Select value={managerEmail || 'none'} onValueChange={(v) => setManagerEmail(v === 'none' ? '' : v)}>
      <SelectTrigger className="h-9 rounded-lg">
       <SelectValue placeholder="ללא"/>
      </SelectTrigger>
      <SelectContent dir="rtl">
       <SelectItem value="none">ללא</SelectItem>
       {members
        .filter(m => cleanEmail(m.email) !== cleanEmail(member?.email))
        .map(m => (
         <SelectItem key={m.id} value={cleanEmail(m.email)}>
          {m.name}
         </SelectItem>
        ))}
      </SelectContent>
     </Select>
    </div>

    <div className="space-y-3 pt-3 border-t border-border">
     <div className="flex items-center gap-2">
      <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
      <Label className="text-xs font-medium text-muted-foreground">כניסה למערכת</Label>
     </div>

     <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">שם משתמש</Label>
      <Input
       value={username}
       onChange={(e) => setUsername(e.target.value)}
       placeholder="dana.levi"
       dir="ltr"
       autoComplete="off"
       className="h-9 rounded-lg"
      />
      <p className="text-[11px] text-muted-foreground">3–32 תווים באנגלית, ספרות, נקודה, מקף או קו תחתון. אופציונלי.</p>
     </div>

     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
       <Label className="text-xs font-medium text-muted-foreground">
        {hasPassword ? 'סיסמה חדשה' : 'סיסמה'}
       </Label>
       <div className="relative">
        <Input
         type={showPassword ? 'text' : 'password'}
         value={password}
         onChange={(e) => { setPassword(e.target.value); setClearCredentials(false); }}
         placeholder={hasPassword ? 'השאר ריק כדי לא לשנות' : '8 תווים לפחות'}
         dir="ltr"
         autoComplete="new-password"
         className="h-9 rounded-lg pl-9"
        />
        <button
         type="button"
         onClick={() => setShowPassword((v) => !v)}
         aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
         className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
         {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
       </div>
      </div>
      <div className="space-y-1.5">
       <Label className="text-xs font-medium text-muted-foreground">אימות סיסמה</Label>
       <Input
        type={showPassword ? 'text' : 'password'}
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        dir="ltr"
        autoComplete="new-password"
        className="h-9 rounded-lg"
       />
      </div>
     </div>

     {password && (
      <div className="flex items-center gap-2">
       <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${strength.tone}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
       </div>
       <span className="text-[11px] text-muted-foreground w-20">{strength.label}</span>
      </div>
     )}

     {hasPassword && !password && (
      <label className="flex items-center gap-2 text-xs cursor-pointer">
       <Checkbox checked={clearCredentials} onCheckedChange={(v) => setClearCredentials(v === true)} />
       <span>בטל את הסיסמה הקיימת</span>
      </label>
     )}

     <p className="text-[11px] text-muted-foreground">
      הסיסמה נשמרת מגובבת עם מלח ואינה ניתנת לשחזור או לצפייה.
     </p>
    </div>

    <div className="space-y-2 pt-2 border-t border-border">
     <Label className="text-xs font-medium text-muted-foreground">סוג הרשאה</Label>
     <div className="grid grid-cols-1 gap-2">
      <button type="button"onClick={handleSelectAdmin}
       className={`flex items-center gap-2.5 px-3 py-3 rounded-lg border text-sm font-medium transition-all text-right ${isAdmin ? 'bg-accent text-accent-foreground' : 'bg-card border-border text-muted-foreground hover:border-primary/20'}`}>
       <ShieldCheck className="w-4 h-4 flex-shrink-0"/>
       <div>
        <p className="font-semibold">אדמין</p>
        <p className="text-[11px] font-normal opacity-80">גישה מלאה לכל המערכת — כל הפרויקטים, ההגדרות והנתונים</p>
       </div>
      </button>
      {isOwner ? (
       <span title="לא ניתן להוריד אדמין מבעל המערכת"className="block">
        <button type="button"disabled
         className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg border text-sm font-medium bg-card border-border text-muted-foreground opacity-50 cursor-not-allowed text-right">
         <CubeIcon className="w-4 h-4 flex-shrink-0"/>
         <div>
          <p className="font-semibold">הרשאות פר פרויקט</p>
          <p className="text-[11px] font-normal opacity-80">לא ניתן להוריד אדמין מבעל המערכת</p>
         </div>
        </button>
       </span>
      ) : (
       <button type="button"onClick={() => setIsAdmin(false)}
        className={`flex items-center gap-2.5 px-3 py-3 rounded-lg border text-sm font-medium transition-all text-right ${!isAdmin ? 'bg-accent text-accent-foreground' : 'bg-card border-border text-muted-foreground hover:border-primary/20'}`}>
        <CubeIcon className="w-4 h-4 flex-shrink-0"/>
        <div>
         <p className="font-semibold">הרשאות פר פרויקט</p>
         <p className="text-[11px] font-normal opacity-80">גישה רק לפרויקטים שהוגדרו לו בחלק "גישה לפרויקטים"</p>
        </div>
       </button>
      )}
     </div>
    </div>

    <div className="flex gap-2 justify-start pt-3 border-t border-border">
     <Button type="submit"disabled={busy} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-5 text-sm shadow-none gap-2">
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
      {member ? 'עדכן' : 'הוסף חבר'}
     </Button>
     <Button type="button"variant="outline"onClick={onClose} className="rounded-full h-9 px-4 text-sm">ביטול</Button>
     {member && !isOwner && (
      <Button type="button"variant="ghost"onClick={() => onDelete(member)} className="rounded-full h-9 px-4 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 ms-auto">
       <Trash2 className="w-3.5 h-3.5"/> הסר
      </Button>
     )}
    </div>
   </form>

   {/* Admin confirmation dialog */}
   <AlertDialog open={adminConfirm} onOpenChange={setAdminConfirm}>
    <AlertDialogContent className="rounded-lg"dir="rtl">
     <AlertDialogHeader>
      <AlertDialogTitle>הפיכת משתמש לאדמין</AlertDialogTitle>
      <AlertDialogDescription>המשתמש יקבל גישה מלאה לכל הפרויקטים והנתונים במערכת</AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter className="flex-row-reverse gap-2">
      <AlertDialogCancel className="rounded-full mt-0">ביטול</AlertDialogCancel>
      <AlertDialogAction
       className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
       onClick={() => { setIsAdmin(true); setAdminConfirm(false); }}
      >
       אישור
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </>
 );
}
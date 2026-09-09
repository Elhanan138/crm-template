import React, { useState } from 'react';
import { User, Mail, Shield, Camera, Loader2, Pencil, Check, X } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function InfoRow({ icon: Icon, label, value }) {
 return (
  <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
   <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
    <Icon className="w-4 h-4 text-muted-foreground"/>
   </div>
   <div className="min-w-0 flex-1">
    <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-foreground truncate">{value || '—'}</p>
   </div>
  </div>
 );
}

export default function ProfileDetails({ name, email, roleTitle, isRealAdmin, avatarUrl, uploading, onUploadClick, fileInputRef, onImageUpload, onNameSave }) {
 const [editingName, setEditingName] = useState(false);
 const [nameDraft, setNameDraft] = useState(name);
 const [savingName, setSavingName] = useState(false);

 const startEdit = () => { setNameDraft(name); setEditingName(true); };
 const cancelEdit = () => { setEditingName(false); setNameDraft(name); };
 const saveName = async () => {
  if (!nameDraft.trim() || nameDraft.trim() === name) { setEditingName(false); return; }
  setSavingName(true);
  await onNameSave(nameDraft.trim());
  setSavingName(false);
  setEditingName(false);
 };

 return (
  <div className="space-y-5">
   {/* Identity card */}
   <div className="bg-card rounded-lg border border-border shadow-sm p-6">
    <div className="flex items-center gap-4">
     <div className="relative flex-shrink-0">
      <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-accent text-accent-foreground ring-1 ring-border">
       {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover"/>
       ) : (
        <span className="text-2xl font-bold">{name?.[0] || '?'}</span>
       )}
      </div>
      <input ref={fileInputRef} type="file"accept="image/*"className="hidden"onChange={onImageUpload} />
     </div>
     <div className="min-w-0 flex-1">
      {editingName ? (
       <div className="flex items-center gap-2">
        <Input
         value={nameDraft}
         onChange={e => setNameDraft(e.target.value)}
         onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit(); }}
         autoFocus
         className="text-xl font-bold h-9 max-w-[200px]"
        />
        <Button size="icon" className="h-8 w-8 rounded-full" onClick={saveName} disabled={savingName} title="שמור">
         {savingName ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={cancelEdit} title="ביטול">
         <X className="w-4 h-4"/>
        </Button>
       </div>
      ) : (
       <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-foreground truncate">{name}</h2>
        {onNameSave && (
         <button onClick={startEdit} aria-label="עריכת שם" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <Pencil className="w-4 h-4"/>
         </button>
        )}
       </div>
      )}
      <p className="text-sm text-muted-foreground truncate mt-1">{roleTitle}</p>
      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{email}</p>
      <Button
       variant="outline"
       size="sm"
       onClick={onUploadClick}
       disabled={uploading}
       className="rounded-full gap-2 text-xs h-8 px-3 mt-3"
      >
       {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Camera className="w-3.5 h-3.5"/>}
       {uploading ? 'מעלה...' : 'שנה תמונת פרופיל'}
      </Button>
     </div>
    </div>
   </div>

   {/* Personal details only */}
   <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">פרטים אישיים</h3>
    <InfoRow icon={User} label="שם מלא"value={name} />
    <InfoRow icon={Mail} label="דוא״ל"value={email} />
    <InfoRow icon={CubeIcon} label="תפקיד"value={roleTitle} />
    <InfoRow icon={Shield} label="סוג חשבון"value={isRealAdmin ? 'מנהל מערכת' : 'חבר צוות'} />
   </div>
  </div>
 );
}
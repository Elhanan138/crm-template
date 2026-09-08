import React from 'react';
import { User, Mail, Shield } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';

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

export default function ViewOnlyProfile({ member }) {
 const name = member.name || 'משתמש';
 const email = member.email || '';
 const role = member.role || 'חבר צוות';
 const isAdmin = !!member.is_admin;

 return (
  <div className="space-y-5">
   {/* Identity card */}
   <div className="bg-card rounded-lg border border-border shadow-sm p-6">
    <div className="flex items-center gap-4">
     <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-accent text-accent-foreground ring-1 ring-border">
      <span className="text-2xl font-bold">{name?.[0] || '?'}</span>
     </div>
     <div className="min-w-0 flex-1">
      <h2 className="text-xl font-bold text-foreground truncate flex items-center gap-2">
       {name}
       {isAdmin && (
        <span className="text-[10px] font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
         <Shield className="w-2.5 h-2.5"/> אדמין
        </span>
       )}
      </h2>
      <p className="text-sm text-muted-foreground truncate mt-1">{role}</p>
      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{email}</p>
     </div>
    </div>
   </div>

   {/* Personal details */}
   <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
     פרטים אישיים
    </h3>
    <InfoRow icon={User} label="שם מלא"value={name} />
    <InfoRow icon={Mail} label="דוא״ל"value={email} />
    <InfoRow icon={CubeIcon} label="תפקיד"value={role} />
    <InfoRow icon={Shield} label="סוג חשבון"value={isAdmin ? 'מנהל מערכת' : 'חבר צוות'} />
   </div>
  </div>
 );
}
import React from 'react';
import { api } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AccessMemberRow({ member, projectId, readOnly }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = React.useState(false);

  const handleRemove = async () => {
    setSaving(true);
    try {
      await api.functions.invoke('setProjectMembers', {
        projectId,
        memberEmail: (member.email || '').trim(),
        grant: false,
      });
      queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
      queryClient.invalidateQueries({ queryKey: ['projectPermissions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectPermissionsAll', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('✓ הגישה הוסרה', { duration: 2500 });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        toast.error('אין לך הרשאה לפעולה זו');
      } else if (status === 422) {
        toast.error(err?.response?.data?.error || 'המשתמש אינו קיים במערכת');
      } else {
        toast.error('שגיאה בהסרת גישה');
      }
    }
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card transition-colors">
      <div className="flex flex-wrap items-center gap-2.5 p-2.5">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-muted-foreground">{member.name?.[0] || '?'}</span>
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-[100px]">
          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
        </div>

        {/* Saving indicator */}
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />}

        {/* Full access badge */}
        <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-accent text-[11px] font-medium text-accent-foreground flex-shrink-0">
          <ShieldCheck className="w-3 h-3" />
          גישה מלאה
        </div>

        {/* Remove button — only in edit mode */}
        {!readOnly && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={saving}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors flex-shrink-0 disabled:opacity-50"
            aria-label="הסר גישה"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
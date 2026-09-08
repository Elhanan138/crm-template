import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, ShieldCheck } from 'lucide-react';
import { CubeIcon } from '@radix-ui/react-icons';
import { cleanEmail } from '@/lib/permissions';
import InlineToggleCell from '@/components/shared/inline/InlineToggleCell';

/**
 * Compact grid-based user row.
 * Desktop: [Name+Email 2fr] [Role 1fr] [Badge auto] [Actions auto]
 * Mobile:  [Name+Email 1fr] [Badge auto] [Actions auto]
 */
export default function UserRow({ member, onUpdate, onEdit, onDelete }) {
  const isOwner = cleanEmail(member.email) === '__owner__';

  const badge = member.is_admin ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-success-muted text-success px-2.5 py-1 rounded-full whitespace-nowrap">
      <ShieldCheck className="w-3 h-3" /> אדמין
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full whitespace-nowrap">
      <CubeIcon className="w-3 h-3" /> פר פרויקט
    </span>
  );

  return (
    <div
      onClick={() => onEdit(member)}
      className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_auto_auto] gap-2 sm:gap-4 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors cursor-pointer"
    >
      {/* Col 1: Avatar + Name + Email */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">{member.name?.[0] || '?'}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
          {member.email && (
            <p className="text-xs text-muted-foreground truncate" dir="ltr">{member.email}</p>
          )}
        </div>
      </div>

      {/* Col 2: Role — desktop only, right-aligned to stay close to name */}
      <div className="hidden sm:block text-xs text-muted-foreground text-right">
        {member.role || <span className="text-muted-foreground/50">—</span>}
      </div>

      {/* Col 3: Permission badge */}
      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
       <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground" title="אדמין">
         <ShieldCheck className="w-3 h-3" />
         <InlineToggleCell value={member.is_admin} onChange={is_admin => onUpdate?.(member.id, { is_admin })} disabled={isOwner} />
       </span>
      </div>

      {/* Col 4: Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="ערוך חבר צוות" onClick={() => onEdit(member)}>
          <Pencil className="w-3 h-3" />
        </Button>
        {isOwner ? (
          <Button variant="ghost" size="icon" disabled className="h-8 w-8 text-muted-foreground opacity-40 cursor-not-allowed" aria-label="מחק חבר צוות">
            <Trash2 className="w-3 h-3" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="מחק חבר צוות" onClick={() => onDelete(member)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { cleanEmail } from '@/lib/permissions';

export default function UserMenu() {
  const { user } = useAuth();

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
    enabled: !!user,
  });

  const ownMember = teamMembers.find(m => cleanEmail(m.email) === cleanEmail(user?.email));
  const displayName = ownMember?.name || user?.name || user?.full_name || 'משתמש';
  const role = ownMember?.role;
  const initial = displayName?.[0] || '?';
  const avatarUrl = user?.profile_image_url;

  if (!user) return null;

  return (
    <Link
      to="/profile"
      className="flex items-center gap-2 rounded-full pe-1 ps-2.5 py-1 hover:bg-muted/60 transition-colors"
      title="הפרופיל שלי"
    >
      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold leading-none">{initial}</span>
        )}
      </div>
      <div className="hidden sm:flex flex-col items-start min-w-0 max-w-[140px]">
        <span className="text-xs font-semibold leading-tight truncate text-foreground">
          {displayName}
        </span>
        {role && <span className="text-[10px] text-muted-foreground leading-tight truncate">{role}</span>}
      </div>
    </Link>
  );
}
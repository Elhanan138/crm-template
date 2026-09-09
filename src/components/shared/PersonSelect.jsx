import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { cleanEmail } from '@/lib/permissions';

const NONE = '__none__';

/**
 * The one control for picking a person. Anywhere the system asks "who is
 * responsible", it must offer the actual user directory — never a free-text
 * box that lets a name be typed that belongs to nobody.
 *
 * `by="email"` stores the address (owners, assignees keyed by email);
 * `by="name"` stores the display name (legacy fields that hold a name).
 */
export default function PersonSelect({
  value, onChange, by = 'email', placeholder = 'בחר אחראי...', disabled, className = '', allowNone = true,
}) {
  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
    staleTime: 60000,
  });

  const people = members
    .filter((m) => (by === 'email' ? m.email : m.name))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'he'));

  const valueOf = (m) => (by === 'email' ? cleanEmail(m.email) : (m.name || '').trim());
  const current = by === 'email' ? cleanEmail(value) : (value || '').trim();

  // A stored value whose person is gone must stay visible, not vanish silently.
  const orphan = current && !people.some((m) => valueOf(m) === current);

  return (
    <Select
      value={current || undefined}
      disabled={disabled}
      onValueChange={(v) => onChange(v === NONE ? '' : v)}
    >
      <SelectTrigger className={`h-9 rounded-lg border-border bg-background text-sm ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>ללא</SelectItem>}
        {orphan && <SelectItem value={current}>{current} (לא במערכת)</SelectItem>}
        {people.map((m) => (
          <SelectItem key={m.id} value={valueOf(m)}>
            {m.name || m.email}
            {by === 'email' && m.name && (
              <span className="text-muted-foreground text-[11px] mr-1.5" dir="ltr">{cleanEmail(m.email)}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

/**
 * SINGLE SOURCE OF TRUTH for people names across the entire system.
 *
 * Returns ONLY names from the TeamMember directory (the "Users" page).
 * Account names, email prefixes, or any other derived value must NEVER
 * appear as a selectable/assignable person anywhere in the app.
 */
export function useSelectablePeople() {
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
  });

  return teamMembers
    .map(m => (m.name || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'he'));
}
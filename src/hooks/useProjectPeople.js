import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { CLIENT_ASSIGNEE } from '@/lib/clientAssignee';

/**
 * Returns TeamMember objects scoped to a project.
 *
 * Filtering priority:
 * 1. `member_emails` — users with project access (synced from ProjectPermission +
 *    PM/liaison/admin/creator). This is the authoritative source: only people who
 *    have explicit permission or ownership on the project appear in dropdowns.
 * 2. `team_members` — legacy name-based scoping (fallback when member_emails is empty).
 * 3. All team members (final fallback when neither is set).
 *
 * Guards against non-string projectId to prevent `[object Object]` 404 errors.
 *
 * @param {string} projectId
 * @param {{ includeClient?: boolean }} options — when includeClient is true,
 *   the pseudo "הלקוח" assignee is prepended to the list (always first, never sorted).
 */
export function useProjectPeople(projectId, { includeClient = false } = {}) {
  const isStringId = !!projectId && typeof projectId === 'string';

  const { data: project } = useQuery({
    queryKey: ['project-people', projectId],
    queryFn: () => api.entities.Project.get(projectId),
    enabled: isStringId,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
  });

  return useMemo(() => {
    let result;
    // Priority 1: filter by member_emails (project permissions / ownership)
    const memberEmails = project?.member_emails;
    if (Array.isArray(memberEmails) && memberEmails.length > 0) {
      const emailSet = new Set(
        memberEmails.map(e => (e || '').trim().toLowerCase()).filter(Boolean)
      );
      result = teamMembers
        .filter(m => emailSet.has((m.email || '').trim().toLowerCase()))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
    } else {
      // Priority 2: legacy team_members scoping (by name)
      const scoped = project?.team_members;
      if (Array.isArray(scoped) && scoped.length > 0) {
        const nameSet = new Set(scoped.map(n => (n || '').trim()).filter(Boolean));
        result = teamMembers
          .filter(m => nameSet.has((m.name || '').trim()))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
      } else {
        // Fallback: all team members
        result = teamMembers
          .slice()
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
      }
    }
    // Prepend the pseudo "client" assignee when requested — always first, never sorted
    if (includeClient) {
      result = [CLIENT_ASSIGNEE, ...result];
    }
    return result;
  }, [project?.member_emails, project?.team_members, teamMembers, includeClient]);
}
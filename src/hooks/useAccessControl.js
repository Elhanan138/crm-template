import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { isAdminUser, cleanEmail } from '@/lib/permissions';

/**
 * Central access control hook — BINARY permission model.
 *
 * There are exactly two access levels:
 * 1. Admin (isRealAdmin) — full access to everything.
 * 2. Project member — full access to a specific project.
 *
 * hasProject(projectId) is binary: admin OR (member_emails/editor_emails contains
 * the effective email) OR (user is project_manager/current_liaison) OR (user is
 * the project creator). No granular permId parameter.
 *
 * NOTE: isRealAdmin and isRealAdminBase are identical. Both names are kept as
 * aliases for backward compatibility.
 */
export function useAccessControl() {
  const { user: currentUser, isLoadingAuth: loadingUser, accessCheck, updateUser } = useAuth();

  const accessGranted = accessCheck?.allowed === true;
  const isRealAdmin = !accessCheck?.demoted && isAdminUser(currentUser);
  // Alias kept for backward compatibility.
  const isRealAdminBase = isRealAdmin;

  const { data: teamMembers = [], isPending: pendingMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
    enabled: !!currentUser && accessGranted,
  });

  const { data: projectPerms = [], isPending: pendingProjPerms } = useQuery({
    queryKey: ['projectPermissions'],
    queryFn: () => api.entities.ProjectPermission.list(),
    enabled: !!currentUser && accessGranted,
  });

  const { data: projectsMeta = [], isPending: pendingProjectsMeta } = useQuery({
    queryKey: ['projectsCreatorMeta'],
    queryFn: () => api.entities.Project.list(),
    enabled: !!currentUser && accessGranted,
  });

  const isLoading = loadingUser || pendingMembers || pendingProjPerms || pendingProjectsMeta;

  const effectiveUser = {
    email: cleanEmail(currentUser?.email),
    full_name: teamMembers.find(m => cleanEmail(m.email) === cleanEmail(currentUser?.email))?.name || '',
  };

  const teamMember = teamMembers.find(m => cleanEmail(m.email) === effectiveUser.email);

  const isAllowed = isRealAdmin || !!teamMember;

  // Binary project access: admin OR member/editor OR PM/liaison OR creator.
  const hasProject = (projectId) => {
    if (isRealAdmin) return true;
    const proj = projectsMeta.find(p => p.id === projectId);
    if (!proj) return false;
    const email = cleanEmail(effectiveUser.email);

    if (Array.isArray(proj.member_emails) && proj.member_emails.some(e => cleanEmail(e) === email)) return true;
    if (Array.isArray(proj.editor_emails) && proj.editor_emails.some(e => cleanEmail(e) === email)) return true;

    const userFullName = (effectiveUser?.full_name || '').trim();
    if (userFullName) {
      if (proj.project_manager && proj.project_manager.trim() === userFullName) return true;
      if (proj.current_liaison && proj.current_liaison.trim() === userFullName) return true;
    }

    const isCreator = currentUser?.id && proj.created_by_id === currentUser.id;
    if (isCreator) return true;

    return false;
  };

  const canViewProject = (projectId) => hasProject(projectId);

  // No global permissions — only admin.
  const hasGlobal = () => isRealAdmin;

  // Does the user have access to at least one project?
  const hasAnyProjectAccess = useMemo(() => {
    if (isRealAdmin) return true;
    return projectsMeta.some(p => hasProject(p.id));
  }, [projectsMeta, isRealAdmin, effectiveUser, teamMembers]);

  return {
    currentUser,
    effectiveUser,
    isRealAdmin,
    isRealAdminBase,
    isAllowed,
    isLoading,
    teamMember,
    teamMembers,
    projectPerms,
    hasGlobal,
    hasProject,
    canViewProject,
    hasAnyProjectAccess,
    updateUser,
  };
}
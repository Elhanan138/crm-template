/**
 * useProjectFromUrl — resolves a project from the URL's /projects/:ref segment.
 *
 * The URL ref can be a slug OR an ObjectId. This hook:
 * 1. Checks the react-query cache for the project list first (instant).
 * 2. If not found in cache, calls resolveProjectRef (filter by slug, fallback to get).
 * 3. Returns { project, projectId, isLoading } — projectId is ALWAYS the real DB ID.
 *
 * Also handles canonical slug redirect: if the URL has an ObjectId but the project
 * has a slug, the parent component should redirect to the slug-based URL.
 */

import { useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { isObjectId, resolveProjectRef, getProjectPathFromId } from '@/lib/projectSlug';

/**
 * Returns a function that resolves a project ID to its canonical path.
 * Checks the react-query cache first; falls back to `/projects/${id}` (canonical redirect handles it).
 */
export function useProjectPath() {
  const queryClient = useQueryClient();
  return useCallback((projectId) => getProjectPathFromId(projectId, queryClient), [queryClient]);
}

export function useProjectFromUrl() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const ref = useMemo(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1] || null;
  }, [location.pathname]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', ref],
    queryFn: async () => {
      if (!ref) return null;
      return await resolveProjectRef(ref, { queryClient });
    },
    enabled: !!ref,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    meta: { silent: true },
  });

  const projectId = project?.id || null;

  return {
    ref,
    project,
    projectId,
    isLoading: !!ref && isLoading,
  };
}
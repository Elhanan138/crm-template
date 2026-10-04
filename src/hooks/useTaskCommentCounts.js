import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

// Map of task_id -> number of comments. Pass projectId to scope to one project.
export function useTaskCommentCounts(projectId) {
  const { data: comments = [] } = useQuery({
    queryKey: ['taskCommentCounts', projectId || 'all'],
    queryFn: () => projectId
      ? api.entities.TaskComment.filter({ project_id: projectId })
      : api.entities.TaskComment.list(),
  });
  return useMemo(() => comments.reduce((acc, c) => {
    acc[c.task_id] = (acc[c.task_id] || 0) + 1;
    return acc;
  }, {}), [comments]);
}
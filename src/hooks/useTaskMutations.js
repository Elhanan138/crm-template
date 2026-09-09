import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';

// All known task query-key prefixes across the app.
// setQueriesData / invalidateQueries with these prefixes will match
// ['tasks'], ['tasks', projectId], ['allTasksGlobal'], ['allTasks'], etc.
const TASK_KEY_PREFIXES = [['tasks'], ['allTasksGlobal'], ['allTasks'], ['dashboard-tasks']];

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const updateAllTaskCaches = (updater) => {
    TASK_KEY_PREFIXES.forEach(prefix => {
      queryClient.setQueriesData({ queryKey: prefix }, old =>
        Array.isArray(old) ? updater(old) : old
      );
    });
  };

  const snapshotAllTaskCaches = () => {
    const snapshots = [];
    TASK_KEY_PREFIXES.forEach(prefix => {
      const queries = queryClient.getQueriesData({ queryKey: prefix });
      queries.forEach(([key, data]) => {
        if (data) snapshots.push({ key, data });
      });
    });
    return snapshots;
  };

  const rollbackTaskCaches = (snapshots) => {
    snapshots.forEach(({ key, data }) => queryClient.setQueryData(key, data));
  };

  const invalidateAllTaskCaches = () => {
    TASK_KEY_PREFIXES.forEach(prefix => {
      queryClient.invalidateQueries({ queryKey: prefix });
    });
  };

  // ── Optimistic update (status, assignee, due_date, etc.) ──
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      TASK_KEY_PREFIXES.forEach(prefix => {
        queryClient.cancelQueries({ queryKey: prefix });
      });
      const snapshots = snapshotAllTaskCaches();
      updateAllTaskCaches(tasks => tasks.map(t =>
        t.id === id ? { ...t, ...data } : t
      ));
      return { snapshots };
    },
    onError: (err, vars, context) => {
      if (context?.snapshots) rollbackTaskCaches(context.snapshots);
      toast.error('העדכון נכשלה');
    },
    onSettled: () => invalidateAllTaskCaches(),
  });

  // ── Soft delete with undo ──
  const deleteWithUndo = (task) => {
    const snapshots = snapshotAllTaskCaches();
    updateAllTaskCaches(tasks => tasks.filter(t => t.id !== task.id));

    let undone = false;
    toast(`המשימה "${task.title}" נמחקה`, {
      duration: 3000,
      action: {
        label: 'בטל',
        onClick: () => {
          undone = true;
          rollbackTaskCaches(snapshots);
          toast.success('המחיקה בוטלה');
        },
      },
    });

    setTimeout(() => {
      if (undone) return;
      api.functions.invoke('deleteTask', { taskId: task.id })
        .then(() => invalidateAllTaskCaches())
        .catch(() => {
          rollbackTaskCaches(snapshots);
          toast.error('המחיקה נכשלה');
        });
    }, 3000);
  };

  return { updateMutation, deleteWithUndo };
}
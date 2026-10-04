import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { captureError } from '@/lib/errorCapture';

export const queryClientInstance = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Non-critical queries (visibility, settings) fail silently — transient
      // network blips on these shouldn't disrupt the user with a toast.
      if (query?.meta?.silent) return;
      // Global query failure capture — every failed load in the system.
      captureError({
        error,
        operation: 'query.fetch',
        entityOrFunction: query?.queryKey?.[0],
        context: { silent: false },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // Global mutation failure capture — every failed save in the system.
      captureError({
        error,
        operation: 'mutation.execute',
        entityOrFunction: mutation?.options?.meta?.entity || mutation?.options?.meta?.function || mutation?.key?.[0],
        context: { silent: false },
      });
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
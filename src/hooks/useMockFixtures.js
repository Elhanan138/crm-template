import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export function useMockFixtures(enabled) {
  return useQuery({
    queryKey: ['mock-fixtures'],
    queryFn: async () => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'list' });
      return res.data?.fixtures || [];
    },
    enabled: !!enabled,
    retry: false,
  });
}

export function useMockCounts(enabled) {
  return useQuery({
    queryKey: ['mock-counts'],
    queryFn: async () => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'counts' });
      return res.data || { calendar_events: 0, meeting_logs: 0, fixtures: 0, demo_project_exists: false };
    },
    enabled: !!enabled,
    retry: false,
  });
}

export function useSeedMockData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'seed' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-fixtures'] });
      queryClient.invalidateQueries({ queryKey: ['mock-counts'] });
    },
  });
}

export function usePurgeMockData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'purge' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-fixtures'] });
      queryClient.invalidateQueries({ queryKey: ['mock-counts'] });
    },
  });
}

export function useToggleFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'toggle', id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-fixtures'] });
    },
  });
}

export function useUpdateFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'update', ...payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-fixtures'] });
    },
  });
}

export function useCreateFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'create', ...payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-fixtures'] });
    },
  });
}

export function useDeleteFixture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.functions.invoke('manageMockFixtures', { action: 'delete', id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-fixtures'] });
    },
  });
}
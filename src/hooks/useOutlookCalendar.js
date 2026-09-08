import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

// Org-level toggle + user connection state — any authenticated user
export function useOutlookCalendarConfig() {
  return useQuery({
    queryKey: ['outlook-calendar-config'],
    queryFn: async () => {
      const res = await api.functions.invoke('outlookCalendarConfig', { action: 'get' });
      return res.data || { enabled: false, userVisible: true, connected: false };
    },
    retry: 1,
    meta: { silent: true },
  });
}

// Fetches Outlook calendar events from the CalendarEvent cache — accepts a date range
export function useOutlookCalendarEvents(enabled, range) {
  return useQuery({
    queryKey: ['outlook-calendar-events', range?.start, range?.end],
    queryFn: async () => {
      const res = await api.functions.invoke('fetchOutlookCalendar', {
        start: range?.start?.toISOString?.() || range?.start,
        end: range?.end?.toISOString?.() || range?.end,
      });
      return res.data?.events || [];
    },
    enabled: !!enabled,
    retry: 1,
    meta: { silent: true },
  });
}

// Admin: all sync settings from AppSetting
export function useOutlookSyncSettings(enabled) {
  return useQuery({
    queryKey: ['outlook-sync-settings'],
    queryFn: async () => {
      const keys = [
        'integration_mode',
        'outlook_calendar_enabled',
        'outlook_sync_enabled',
        'outlook_sync_hour',
        'outlook_sync_backfill_days',
        'outlook_sync_forward_days',
        'outlook_sync_throttle_minutes',
        'system_admin_emails',
        'teams_attendance_enabled',
        'teams_attendance_min_seconds',
        'teams_prefer_actual_duration',
      ];
      const results = await Promise.all(
        keys.map(k => api.entities.AppSetting.filter({ key: k }))
      );
      const map = {};
      keys.forEach((k, i) => {
        const s = results[i]?.[0];
        map[k] = s?.value ?? null;
      });
      return map;
    },
    enabled: !!enabled,
    retry: false,
  });
}

// Admin: connector live status
export function useIntegrationStatus(enabled) {
  return useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => {
      const res = await api.functions.invoke('checkIntegrations', {});
      return res.data || {};
    },
    enabled: !!enabled,
    retry: false,
  });
}

// Admin: per-user sync state list
export function useOutlookAdminUsers(enabled) {
  return useQuery({
    queryKey: ['outlook-admin-users'],
    queryFn: async () => {
      const res = await api.functions.invoke('adminSyncControl', { action: 'list' });
      return res.data?.users || [];
    },
    enabled: !!enabled,
    retry: false,
  });
}

// Admin: mutation for sync control actions
export function useAdminSyncAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.functions.invoke('adminSyncControl', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-admin-users'] });
    },
  });
}

// Admin: save a setting to AppSetting
export function useSaveSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = await api.entities.AppSetting.filter({ key });
      if (existing.length > 0) {
        await api.entities.AppSetting.update(existing[0].id, { value });
      } else {
        await api.entities.AppSetting.create({ key, value });
      }
      return { key, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-sync-settings'] });
    },
  });
}

// Legacy: admin connection status (kept for backward compatibility)
export function useOutlookConnectionStatus(enabled) {
  return useQuery({
    queryKey: ['outlook-connection-status'],
    queryFn: async () => {
      const res = await api.functions.invoke('outlookConnectionStatus', {});
      return res.data?.status || [];
    },
    enabled: !!enabled,
    retry: false,
  });
}

// Personal sync trigger
export function useSyncMyCalendar() {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.functions.invoke('syncOutlookCalendar', payload);
      return res.data;
    },
  });
}

// On-demand Teams attendance fetch for a single CalendarEvent
export function useFetchTeamsAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ calendar_event_id }) => {
      const res = await api.functions.invoke('fetchTeamsAttendance', { calendar_event_id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-calendar-events'] });
    },
  });
}
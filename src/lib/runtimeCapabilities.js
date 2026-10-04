import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { SUPABASE_SETTING_KEY, validateSupabaseConfig } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME CAPABILITIES
//
// The build knows which features were COMPILED IN (src/lib/features.js) and an
// administrator decides which are OPEN (src/lib/capabilities.js). Neither
// answers the third question, and it is the one that was breaking the product:
// is there a server behind this deployment at all?
//
// Without one, the assistant, mail tracking, Gmail, Outlook, Teams and directory
// sync cannot work — and until now they were shown anyway, as live buttons that
// returned "requires a server" the moment they were pressed. A button that
// cannot work must not be offered.
//
// One question, one answer, one place:  hasServer()
//
// It is true when the deployment has a configured Supabase project, or when a
// VITE_API_BASE was supplied at build time. `unavailable()` in the client and
// `serverOnly()` in the local functions stay as a safety net behind this, never
// as the way a person finds out.
// ─────────────────────────────────────────────────────────────────────────────

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

/** A build-time backend, if one was configured. */
export const API_BASE = String(env.VITE_API_BASE || '').trim();

/** Does a stored Supabase configuration describe a usable project? */
export const isSupabaseReady = (config) =>
  !!config?.enabled && !!config?.url && !!config?.anon_key && validateSupabaseConfig(config) === null;

/** The synchronous part of the answer: a backend baked into the build. */
export const hasBuildTimeServer = () => API_BASE.length > 0;

export const SERVER_FEATURES = [
  'agent', 'email-tracking', 'gmail', 'outlook', 'teams', 'directory-sync',
];

/**
 * Server availability, and the Supabase configuration it was derived from.
 *
 * `isLoading` matters: a surface must not flash into view and disappear, so
 * callers render nothing until the answer is known.
 */
export function useServerRuntime() {
  const { data, isLoading } = useQuery({
    queryKey: ['runtime-supabase-config'],
    queryFn: async () => {
      const res = await api.functions.invoke('globalTabVisibility', { settingKey: SUPABASE_SETTING_KEY });
      return res?.data?.value || null;
    },
    staleTime: 60000,
    retry: false,
    meta: { silent: true },
  });

  const supabaseReady = isSupabaseReady(data);
  return {
    isLoading,
    config: data,
    supabaseReady,
    hasServer: hasBuildTimeServer() || supabaseReady,
    /** Why there is no server, for the one place that should say so. */
    reason: hasBuildTimeServer() || supabaseReady
      ? null
      : data?.url
        ? 'configured_not_connected'
        : 'not_configured',
  };
}

/** Convenience for a surface that only needs the boolean. */
export function useHasServer() {
  const { hasServer, isLoading } = useServerRuntime();
  return { hasServer, isLoading };
}

export const CONNECTION_STATES = {
  not_configured: { label: 'לא מוגדר · דורש שרת', tone: 'neutral' },
  configured_not_connected: { label: 'מוגדר · לא מחובר', tone: 'warning' },
  connected: { label: 'מחובר', tone: 'success' },
};

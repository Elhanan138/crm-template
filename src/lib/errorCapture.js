// ====================================================================
// CENTRAL ERROR CAPTURE
// --------------------------------------------------------------------
// captureError() is the SINGLE entry point for every error in the app.
// It maps a raw error to a stable code, builds a full bilingual report
// (via buildErrorReport), stores the last 20 in sessionStorage, and
// shows a user-facing ErrorToast.
//
// Usage in catch blocks:
//   import { captureError } from '@/lib/errorCapture';
//   catch (err) { captureError({ error: err, operation: 'entity.update', entityOrFunction: 'Task' }); }
// ====================================================================

import { toast } from 'sonner';
import {
  ERROR_CODES,
  getErrorInfo,
  buildErrorReport,
} from '@/lib/errors';
// Lazy API client — avoids circular import issues at module load time.
let _apiClient = null;
async function getApiClient() {
  if (!_apiClient) {
    try {
      const mod = await import('@/api/client');
      _apiClient = mod.api;
    } catch { /* ignore */ }
  }
  return _apiClient;
}

const LOG_KEY = 'errorLog_v1';
const MAX_ENTRIES = 20;

// ── Helpers ──

function getCurrentUser() {
  // Best-effort — avoids importing React context into a plain module.
  // No longer reads from localStorage; returns null so captureError
  // skips user context when the React context isn't available.
  return null;
}

// ── Map raw error → stable code ──

export function mapErrorToCode(error) {
  if (!error) return 'ERR_UNKNOWN_500';
  const status = error.status || error.statusCode || error.response?.status;
  const msg = String(error.message || error || '');

  if (status === 403) return 'ERR_PERMISSION_DENIED_101';
  if (status === 401) return 'ERR_PERMISSION_DENIED_101';

  // Network / load failures
  if (status === 0 || /network|fetch|load|timeout|ECONN/i.test(msg))
    return 'ERR_LOAD_FAILED_301';

  // Save / validation failures
  if (status === 400 || status === 409 || status === 422)
    return 'ERR_SAVE_FAILED_302';

  // AI / function failures
  if (/ai|assistant|llm|invoke|function/i.test(msg))
    return 'ERR_FUNCTION_FAILED_401';

  // React render errors (TypeError: dispatcher.* / null is not an object / Cannot read properties of null)
  if (!status && /TypeError|dispatcher|is not an object|Cannot read prop/i.test(msg))
    return 'ERR_REACT_RENDER_501';

  if (status >= 500) return 'ERR_UNKNOWN_500';

  return 'ERR_UNKNOWN_500';
}

// ── sessionStorage log (last 20) ──

export function getRecentErrors() {
  try {
    const raw = sessionStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function addRecentError(entry) {
  try {
    const list = getRecentErrors();
    list.unshift(entry);
    const trimmed = list.slice(0, MAX_ENTRIES);
    sessionStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
  } catch { /* ignore quota errors */ }
}

export function clearRecentErrors() {
  try { sessionStorage.removeItem(LOG_KEY); } catch { /* ignore */ }
}

// ── Clipboard ──

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Toast (sonner, no JSX needed) ──

export function showErrorToast(code, context = {}) {
  const info = getErrorInfo(code);
  const report = buildErrorReport(code, context);

  toast.error(info.title, {
    description: info.message,
    duration: 6000,
    action: {
      label: 'העתק פרטים',
      onClick: async () => {
        const ok = await copyToClipboard(report);
        if (ok) toast.success('הדוח הועתק ללוח');
        else toast.error('לא ניתן היה להעתיק');
      },
    },
  });
}

// ── Main entry point ──

export function captureError({
  error,
  code,
  operation = '',
  entityOrFunction = '',
  context = {},
}) {
  const resolvedCode = code || mapErrorToCode(error);

  const user = getCurrentUser();
  const fullContext = {
    userEmail: user?.email || context.userEmail || '',
    userRole: user?.role || context.userRole || '',
    operation: operation || context.operation || '',
    entityOrFunction: entityOrFunction || context.entityOrFunction || '',
    recordId: context.recordId || context.id || '',
    projectId: context.projectId || '',
    rawError: error?.message || String(error || '') || context.rawError || context.details || '',
    statusCode: error?.status || error?.statusCode || context.statusCode || '',
    stack: error?.stack || context.stack || '',
    component: context.component || context.page || '',
    ...context,
  };

  const report = buildErrorReport(resolvedCode, fullContext);

  // Store compact entry in sessionStorage
  addRecentError({
    code: resolvedCode,
    timestamp: new Date().toISOString(),
    route: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
    operation: fullContext.operation,
    entity_or_function: fullContext.entityOrFunction,
    report,
  });

  // Fire-and-forget: persist to ErrorLog entity (visible to admins in Reports)
  persistErrorLog(resolvedCode, fullContext, report);

  // Show toast (unless explicitly suppressed)
  if (!context.silent) {
    showErrorToast(resolvedCode, fullContext);
  }

   
  console.error(`[${resolvedCode}]`, error);

  return { code: resolvedCode, report, context: fullContext };
}

// ── Persist to ErrorLog entity (fire-and-forget, never throws) ──

async function persistErrorLog(code, context, report) {
  try {
    const apiClient = await getApiClient();
    if (!apiClient) return;
    const info = getErrorInfo(code);
    apiClient.entities.ErrorLog.create({
      code,
      title: info.title,
      message: info.message,
      report,
      user_email: context.userEmail || '',
      user_role: context.userRole || '',
      route: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
      operation: context.operation || '',
      entity_or_function: context.entityOrFunction || '',
      raw_error: (context.rawError || '').slice(0, 2000),
      status_code: context.statusCode || null,
    }).catch(() => {});
  } catch { /* ignore — never let persistence break the app */ }
}

// ── Global handlers (quiet — console + sessionStorage, no toasts) ──

export function initGlobalErrorCapture() {
  if (typeof window === 'undefined') return;

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event?.reason;
    captureError({
      error,
      operation: 'unhandledrejection',
      context: { silent: true },
    });
  });

  // Synchronous errors
  window.onerror = (message, source, lineno, colno, error) => {
    captureError({
      error: error || new Error(String(message)),
      operation: 'window.onerror',
      context: {
        silent: true,
        rawError: `${message} (${source}:${lineno}:${colno})`,
      },
    });
  };
}
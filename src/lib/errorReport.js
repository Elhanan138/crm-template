// Pure error-report builder — no React, no SDK, no I/O.
// Builds structured report data for clipboard copy and support-ticket pre-fill.
//
// buildErrorReport({ code, context, error }) → { clipboardText, ticketTitle, ticketDescription }
//
// - Missing fields never produce "undefined" in output.
// - Stack is truncated to 2000 chars with a truncation marker.
// - Unknown codes fall back to the generic ERR_UNKNOWN_500 description.
// - Sensitive data (tokens, passwords, API keys) is redacted.

import { getErrorInfo } from '@/lib/errors';

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /token[=:]\s*[A-Za-z0-9\-._]+/gi,
  /password[=:]\s*\S+/gi,
  /api[_-]?key[=:]\s*[A-Za-z0-9\-._]+/gi,
  /secret[=:]\s*[A-Za-z0-9\-._]+/gi,
];

const MAX_STACK_LENGTH = 2000;

function redactSensitive(text) {
  if (!text) return '';
  let result = String(text);
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function truncateStack(stack) {
  if (!stack) return '';
  const str = String(stack);
  if (str.length <= MAX_STACK_LENGTH) return str;
  return str.slice(0, MAX_STACK_LENGTH) + '\n... [truncated at 2000 chars]';
}

function safe(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * @param {object} opts
 * @param {string} [opts.code] — Error code (e.g. ERR_SAVE_FAILED_302)
 * @param {object} [opts.context] — Context fields (userEmail, projectId, route, requestId, etc.)
 * @param {Error} [opts.error] — Raw error object (for stack trace)
 * @returns {{ clipboardText: string, ticketTitle: string, ticketDescription: string }}
 */
export function buildErrorReport({ code = 'ERR_UNKNOWN_500', context = {}, error = null } = {}) {
  const info = getErrorInfo(code);
  const ts = new Date();
  const route = safe(context.route) || (typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '');
  const userEmail = safe(context.userEmail);
  const projectId = safe(context.projectId);
  const requestId = safe(context.requestId);
  const operation = safe(context.operation);
  const entityOrFunction = safe(context.entityOrFunction);
  const stack = error?.stack || safe(context.stack);

  // --- Clipboard text (compact, structured) ---
  const clipLines = [
    `Error Code: ${code}`,
    `Time: ${ts.toISOString()}`,
  ];
  if (route) clipLines.push(`Route: ${route}`);
  if (userEmail) clipLines.push(`User: ${userEmail}`);
  if (projectId) clipLines.push(`Project: ${projectId}`);
  if (requestId) clipLines.push(`Request ID: ${String(requestId).slice(0, 8)}`);
  if (operation) clipLines.push(`Operation: ${operation}`);
  if (entityOrFunction) clipLines.push(`Entity: ${entityOrFunction}`);

  const clipboardText = redactSensitive(clipLines.join('\n'));

  // --- Ticket title (short, < 100 chars) ---
  const ticketTitle = `שגיאה ${code}`.slice(0, 100);

  // --- Ticket description (full context + stack) ---
  const descLines = [
    `קוד שגיאה: ${code}`,
    `כותרת: ${info.title}`,
    `תיאור: ${info.message}`,
    `זמן: ${ts.toISOString()}`,
  ];
  if (route) descLines.push(`נתיב: ${route}`);
  if (userEmail) descLines.push(`משתמש: ${userEmail}`);
  if (projectId) descLines.push(`פרויקט: ${projectId}`);
  if (operation) descLines.push(`פעולה: ${operation}`);
  if (entityOrFunction) descLines.push(`ישות: ${entityOrFunction}`);
  if (stack) descLines.push('', '--- Stack Trace ---', truncateStack(stack));

  const ticketDescription = redactSensitive(descLines.join('\n'));

  return { clipboardText, ticketTitle, ticketDescription };
}

/**
 * Clipboard copy with execCommand fallback for non-secure contexts.
 */
export async function copyToClipboardWithFallback(text) {
  // Try modern async clipboard API
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand
  }
  // Fallback: execCommand('copy')
  try {
    if (typeof document === 'undefined') return false;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
import { api } from '@/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN AUDIT LOG
//
// Record edits already leave a trail (see src/lib/crm/recordTrail.js). What had
// no trail at all was the administration itself: who granted someone admin, who
// switched a module off for everyone, who reset the branding, who exported a
// bundle of the customer's data. Those are the changes that are hardest to
// explain after the fact and the ones most likely to be asked about.
//
// One entity, one shape, written from anywhere with a single call. Writing must
// never be able to break the thing being audited, so a failure here is
// swallowed: an audit entry that cannot be saved must not stop an admin from
// saving a setting.
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIT_ENTITY = 'AuditLog';

export const AUDIT_AREAS = [
  { value: 'users', label: 'משתמשים והרשאות', tone: 'warning' },
  { value: 'capabilities', label: 'יכולות המערכת', tone: 'info' },
  { value: 'features', label: 'תכונות מערכת', tone: 'info' },
  { value: 'custom-fields', label: 'שדות מותאמים', tone: 'neutral' },
  { value: 'branding', label: 'מיתוג', tone: 'neutral' },
  { value: 'integrations', label: 'אינטגרציות', tone: 'info' },
  { value: 'automations', label: 'אוטומציות', tone: 'warning' },
  { value: 'export', label: 'ייצוא חבילה', tone: 'success' },
  { value: 'data', label: 'נתונים', tone: 'destructive' },
];

export const areaMeta = (value) =>
  AUDIT_AREAS.find((a) => a.value === value) || { value, label: value, tone: 'neutral' };

/** A value as it should read in a log line, however it was stored. */
export function describeValue(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'פעיל' : 'כבוי';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Write one line into the log.
 *
 * @param {object} entry
 * @param {string} entry.area    which part of the system — an AUDIT_AREAS value
 * @param {string} entry.action  what was done, in Hebrew, as a person would say it
 * @param {string} [entry.target] what it was done to — a user, a module, a field
 * @param {*} [entry.before]     the value before, when there was one
 * @param {*} [entry.after]      the value after
 */
export async function recordAudit(entry) {
  try {
    const user = await api.auth.me().catch(() => null);
    await api.entities[AUDIT_ENTITY].create({
      area: entry.area,
      action: entry.action,
      target: entry.target || '',
      before: entry.before === undefined ? '' : describeValue(entry.before),
      after: entry.after === undefined ? '' : describeValue(entry.after),
      actor_email: user?.email || '',
      actor_name: user?.full_name || user?.name || '',
      created_date: new Date().toISOString(),
    });
    return true;
  } catch {
    // Never let the audit trail block the action it is describing.
    return false;
  }
}

/** Newest first, which is the only order anyone reads a log in. */
export const sortAudit = (rows) =>
  [...(rows || [])].sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));

/** Free-text match across everything a line says. */
export function matchesAudit(row, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return [row.action, row.target, row.actor_name, row.actor_email, row.before, row.after, areaMeta(row.area).label]
    .filter(Boolean)
    .some((text) => String(text).toLowerCase().includes(q));
}

/** The log as a spreadsheet, for whoever asked for it in writing. */
export function auditToCsv(rows) {
  const header = ['תאריך', 'מי', 'תחום', 'פעולה', 'על מה', 'לפני', 'אחרי'];
  const cell = (v) => {
    const text = String(v ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = sortAudit(rows).map((r) => [
    r.created_date || '',
    r.actor_name || r.actor_email || '',
    areaMeta(r.area).label,
    r.action || '',
    r.target || '',
    r.before || '',
    r.after || '',
  ].map(cell).join(','));
  // The BOM is what makes Excel open a Hebrew CSV as UTF-8 rather than as mojibake.
  return '﻿' + [header.join(','), ...lines].join('\n');
}

// ═══════════════════════════════════════════════════════════════
// OUTLOOK CALENDAR — APP USER CONNECTOR ID
// ═══════════════════════════════════════════════════════════════
// Replace the value below with your connector ID.
// Get it from: Dashboard → Settings → OAuth Connectors → Outlook Calendar (App User)
//
// This is the ONLY place to change in the frontend.
// The backend function (fetchOutlookCalendar/entry.ts) has its own copy.
// ═══════════════════════════════════════════════════════════════
export const OUTLOOK_CONNECTOR_ID = "REPLACE_WITH_YOUR_OUTLOOK_CONNECTOR_ID";

// AppSetting key for the org-level toggle
export const OUTLOOK_CALENDAR_SETTING_KEY = "outlook_calendar_enabled";
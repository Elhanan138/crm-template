// Owner / first-admin identity. Never hardcode a personal address in the codebase:
// every deployment sets these in its own .env file. Falls back to a neutral value
// so an exported ZIP contains no personal data.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const OWNER_EMAIL = String(env.VITE_OWNER_EMAIL || 'admin@localhost').toLowerCase().trim();
export const OWNER_NAME = String(env.VITE_OWNER_NAME || 'מנהל המערכת');

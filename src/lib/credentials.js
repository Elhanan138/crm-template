// ─────────────────────────────────────────────────────────────────────────────
// LOCAL CREDENTIALS
//
// Passwords are never stored, transmitted or displayed in clear text. Each one
// is salted and hashed with SHA-256 via the Web Crypto API before it leaves the
// form, and only the digest is persisted.
//
// This is adequate for the standalone localStorage build. Any deployment with a
// real backend must move verification server-side — see docs/DEPLOYMENT.md.
// ─────────────────────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const randomSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)));

export async function hashPassword(password, salt) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${password}`));
  return toHex(digest);
}

export async function makeCredentials(password) {
  const salt = randomSalt();
  return {
    password_salt: salt,
    password_hash: await hashPassword(password, salt),
    password_updated_at: new Date().toISOString(),
  };
}

export async function verifyPassword(password, record) {
  if (!record?.password_hash || !record?.password_salt) return false;
  return (await hashPassword(password, record.password_salt)) === record.password_hash;
}

export const CLEARED_CREDENTIALS = {
  password_salt: null,
  password_hash: null,
  password_updated_at: null,
};

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

/** @returns {string|null} an error message, or null when valid. */
export function validateUsername(username, existing = [], selfId = null) {
  const value = (username || '').trim();
  if (!value) return null; // optional
  if (!USERNAME_RE.test(value)) return 'שם משתמש: 3–32 תווים באנגלית, ספרות, נקודה, מקף או קו תחתון';
  const taken = existing.some(
    (m) => m.id !== selfId && (m.username || '').toLowerCase() === value.toLowerCase()
  );
  return taken ? 'שם המשתמש כבר תפוס' : null;
}

export function passwordStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const levels = [
    { label: 'חלשה מאוד', tone: 'bg-destructive' },
    { label: 'חלשה', tone: 'bg-destructive' },
    { label: 'סבירה', tone: 'bg-warning' },
    { label: 'טובה', tone: 'bg-warning' },
    { label: 'חזקה', tone: 'bg-success' },
    { label: 'חזקה מאוד', tone: 'bg-success' },
  ];
  return { score, ...levels[score] };
}

export function validatePassword(password, confirm) {
  if (!password) return null;
  if (password.length < 8) return 'הסיסמה חייבת להיות באורך 8 תווים לפחות';
  if (password !== confirm) return 'הסיסמאות אינן תואמות';
  return null;
}

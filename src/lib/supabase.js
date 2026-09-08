import { CRM_SCHEMAS } from '@/lib/crm/schemas';

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE
// Configuration lives in the ordinary settings store, and the schema is derived
// from the module manifest — so the SQL always matches the modules this build
// actually contains, with no second definition to keep in sync.
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_SETTING_KEY = 'supabase_config';

const SQL_TYPES = {
  text: 'text', textarea: 'text', email: 'text', phone: 'text', url: 'text',
  person: 'text', select: 'text',
  number: 'numeric', currency: 'numeric', percent: 'numeric',
  date: 'date', checkbox: 'boolean', relation: 'uuid',
};

const snake = (value) =>
  String(value).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();

export function validateSupabaseConfig(config = {}) {
  const url = (config.url || '').trim();
  const key = (config.anon_key || '').trim();
  if (!url) return 'נדרשת כתובת הפרויקט';
  if (!/^https:\/\/[\w-]+\.supabase\.(co|in)\/?$/.test(url)) {
    return 'כתובת לא תקינה — הפורמט הוא https://xxxx.supabase.co';
  }
  if (!key) return 'נדרש מפתח ציבורי';
  if (key.length < 40) return 'המפתח נראה קצר מדי';
  // service_role tokens carry that role in their payload; refuse them outright.
  try {
    const payload = JSON.parse(atob(key.split('.')[1] || ''));
    if (payload?.role === 'service_role') return 'זהו מפתח service_role — אין להזין אותו כאן';
  } catch { /* not a JWT we can read; the connection test will tell */ }
  return null;
}

/** `CREATE TABLE` statements for every module in this build, plus RLS. */
export function supabaseSchemaSql(prefix = '') {
  const p = snake(prefix || '').replace(/_+$/, '');
  const tableName = (entity) => `${p ? `${p}_` : ''}${snake(entity)}`;

  const blocks = Object.values(CRM_SCHEMAS).map((schema) => {
    const table = tableName(schema.entity);
    const columns = schema.fields
      .map((f) => `  ${snake(f.key)} ${SQL_TYPES[f.type] || 'text'}${f.required ? ' not null' : ''}`)
      .join(',\n');

    return [
      `create table if not exists ${table} (`,
      '  id uuid primary key default gen_random_uuid(),',
      columns + ',',
      '  custom_fields jsonb default \'{}\'::jsonb,',
      '  created_date timestamptz not null default now(),',
      '  updated_date timestamptz not null default now()',
      ');',
      `alter table ${table} enable row level security;`,
      `create policy "${table}_read" on ${table} for select to authenticated using (true);`,
      `create policy "${table}_write" on ${table} for all to authenticated`,
      `  using (owner_email = auth.jwt() ->> 'email')`,
      `  with check (owner_email = auth.jwt() ->> 'email');`,
    ].join('\n');
  });

  return [
    '-- Generated from the module manifest. Re-generate after adding a module.',
    '-- Run in the Supabase SQL editor.',
    '',
    ...blocks,
  ].join('\n\n');
}

/** Tables this build expects to exist. */
export const expectedTables = (prefix = '') => {
  const p = snake(prefix || '').replace(/_+$/, '');
  return Object.values(CRM_SCHEMAS).map((s) => `${p ? `${p}_` : ''}${snake(s.entity)}`);
};

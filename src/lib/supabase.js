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

// Tables that belong to no module: the trail a record leaves, and the trail the
// administration leaves. They are declared here rather than as schemas because
// nothing renders them as a module — but they still have to exist in the
// database, and the SQL is the only place that can say so.
const SUPPORT_TABLES = [
  {
    entity: 'RecordHistory',
    columns: ['entity text not null', 'record_id text not null', 'field text', 'label text', 'before_value text', 'after_value text', 'actor_email text', 'actor_name text'],
  },
  {
    entity: 'RecordActivity',
    columns: ['entity text not null', 'record_id text not null', 'type text', 'body text', 'actor_email text', 'actor_name text'],
  },
  {
    entity: 'RecordFile',
    columns: ['entity text not null', 'record_id text not null', 'file_name text', 'file_url text', 'file_size numeric', 'mime_type text', 'actor_email text'],
  },
  {
    entity: 'FormLayout',
    // One row per record type: the order its form asks its questions in.
    columns: ['entity text not null', `field_order jsonb default '[]'::jsonb`],
  },
  {
    entity: 'AuditLog',
    // Append-only on purpose: a log anyone can edit answers no question.
    appendOnly: true,
    columns: ['area text not null', 'action text not null', 'target text', 'before_value text', 'after_value text', 'actor_email text', 'actor_name text'],
  },
];

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

  const supportBlocks = SUPPORT_TABLES.map((spec) => {
    const table = tableName(spec.entity);
    return [
      `create table if not exists ${table} (`,
      '  id uuid primary key default gen_random_uuid(),',
      spec.columns.map((c) => `  ${c}`).join(',\n') + ',',
      '  created_date timestamptz not null default now()',
      ');',
      `alter table ${table} enable row level security;`,
      `create policy "${table}_read" on ${table} for select to authenticated using (true);`,
      spec.appendOnly
        ? `create policy "${table}_append" on ${table} for insert to authenticated with check (true);`
        : `create policy "${table}_write" on ${table} for all to authenticated using (true) with check (true);`,
    ].join('\n');
  });

  return [
    '-- Generated from the module manifest. Re-generate after adding a module.',
    '-- Run in the Supabase SQL editor.',
    '',
    ...blocks,
    '-- Cross-module tables: record trail and administration audit log.',
    ...supportBlocks,
  ].join('\n\n');
}

/** Tables this build expects to exist. */
export const expectedTables = (prefix = '') => {
  const p = snake(prefix || '').replace(/_+$/, '');
  const named = (entity) => `${p ? `${p}_` : ''}${snake(entity)}`;
  return [
    ...Object.values(CRM_SCHEMAS).map((s) => named(s.entity)),
    ...SUPPORT_TABLES.map((s) => named(s.entity)),
  ];
};

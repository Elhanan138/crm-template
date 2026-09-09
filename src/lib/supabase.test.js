import { describe, it, expect } from 'vitest';
import { validateSupabaseConfig, supabaseSchemaSql, expectedTables, SUPABASE_SETTING_KEY } from './supabase';
import { CRM_SCHEMAS } from './crm/schemas';

const KEY = 'a'.repeat(60);

describe('supabase config validation', () => {
  it('requires a url and a key', () => {
    expect(validateSupabaseConfig({})).toMatch(/כתובת/);
    expect(validateSupabaseConfig({ url: 'https://abc.supabase.co' })).toMatch(/מפתח/);
  });

  it('rejects a malformed project url', () => {
    expect(validateSupabaseConfig({ url: 'http://abc.supabase.co', anon_key: KEY })).toMatch(/לא תקינה/);
    expect(validateSupabaseConfig({ url: 'https://example.com', anon_key: KEY })).toMatch(/לא תקינה/);
  });

  it('accepts a valid pair', () => {
    expect(validateSupabaseConfig({ url: 'https://abcdef.supabase.co', anon_key: KEY })).toBeNull();
  });

  it('refuses a service_role key outright', () => {
    const payload = btoa(JSON.stringify({ role: 'service_role' }));
    const token = `header.${payload}.signature${'x'.repeat(40)}`;
    expect(validateSupabaseConfig({ url: 'https://abcdef.supabase.co', anon_key: token }))
      .toMatch(/service_role/);
  });

  it('is stored under its own settings key', () => {
    expect(SUPABASE_SETTING_KEY).toBe('supabase_config');
  });
});

describe('generated schema', () => {
  const sql = supabaseSchemaSql();

  it('creates a table for every module in the build', () => {
    for (const table of expectedTables()) {
      expect(sql, `missing table ${table}`).toContain(`create table if not exists ${table} (`);
    }
    for (const schema of Object.values(CRM_SCHEMAS)) {
      expect(expectedTables()).toContain(schema.entity.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase());
    }
  });

  it('also creates the tables that belong to no module', () => {
    // The record trail and the audit log are written by every module and
    // declared by none, so nothing else would put them in the database.
    for (const table of ['record_history', 'record_activity', 'record_file', 'audit_log']) {
      expect(sql, `missing table ${table}`).toContain(`create table if not exists ${table} (`);
      expect(expectedTables()).toContain(table);
    }
  });

  it('makes the audit log append-only — a log anyone can edit proves nothing', () => {
    expect(sql).toContain('create policy "audit_log_append" on audit_log for insert');
    expect(sql).not.toContain('audit_log for all');
  });

  it('enables row level security on every table', () => {
    const creates = (sql.match(/create table/g) || []).length;
    const rls = (sql.match(/enable row level security/g) || []).length;
    expect(rls).toBe(creates);
  });

  it('honours a table prefix', () => {
    expect(supabaseSchemaSql('oss_')).toContain('create table if not exists oss_lead (');
    expect(expectedTables('oss')).toContain('oss_lead');
  });

  it('maps field types to real column types', () => {
    expect(sql).toMatch(/amount numeric/);
    expect(sql).toMatch(/created_date timestamptz/);
    expect(sql).toMatch(/custom_fields jsonb/);
  });

  it('marks required fields as not null', () => {
    expect(sql).toMatch(/full_name text not null/);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { invokeLocalFunction } from './localFunctions';

const read = (name) => JSON.parse(localStorage.getItem(`oss_data_${name}`) || '[]');

describe('manageProject (local)', () => {
  beforeEach(() => localStorage.clear());

  it('creates a project and returns a usable id and slug', () => {
    const { data } = invokeLocalFunction('manageProject', {
      action: 'create',
      project_data: { client_name: 'רב-בריח', contract_value: '12000', pricing_model: 'hours_bank', training_hours_purchased: '40' },
    });

    expect(data.success).toBe(true);
    expect(data.project_id).toBeTruthy();
    expect(data.slug).toBe('rb-brych');

    const projects = read('Project');
    expect(projects).toHaveLength(1);
    expect(projects[0].client_name).toBe('רב-בריח');
    expect(projects[0].contract_value).toBe(12000);
    expect(projects[0].training_hours_purchased).toBe(40);
  });

  it('rejects an empty client name instead of silently succeeding', () => {
    expect(() => invokeLocalFunction('manageProject', { action: 'create', project_data: { client_name: '  ' } }))
      .toThrow(/שם הלקוח/);
    expect(read('Project')).toHaveLength(0);
  });

  it('zeroes training hours for fixed-price projects', () => {
    invokeLocalFunction('manageProject', {
      action: 'create',
      project_data: { client_name: 'Acme', pricing_model: 'fix_price', training_hours_purchased: '80' },
    });
    expect(read('Project')[0].training_hours_purchased).toBe(0);
  });

  it('creates highlights attached to the project, and skips the blank ones', () => {
    const { data } = invokeLocalFunction('manageProject', {
      action: 'create',
      project_data: { client_name: 'Globex' },
      client_highlights: [{ title: 'איש קשר', content: 'דנה' }, { title: '' }],
    });
    expect(data.highlights_created).toBe(1);
    expect(read('ClientHighlight')[0].project_id).toBe(data.project_id);
  });

  it('gives two projects with the same name distinct slugs', () => {
    const a = invokeLocalFunction('manageProject', { action: 'create', project_data: { client_name: 'Acme' } });
    const b = invokeLocalFunction('manageProject', { action: 'create', project_data: { client_name: 'Acme' } });
    expect(a.data.slug).toBe('acme');
    expect(b.data.slug).toBe('acme-2');
  });

  it('grants the owner full permission on the new project', () => {
    const { data } = invokeLocalFunction('manageProject', { action: 'create', project_data: { client_name: 'Initech' } });
    const perms = read('ProjectPermission').filter(p => p.project_id === data.project_id);
    expect(perms).toHaveLength(1);
    expect(perms[0].permissions).toEqual(['full']);
  });

  it('updates a project and keeps the old slug as previous_slug', () => {
    const { data } = invokeLocalFunction('manageProject', { action: 'create', project_data: { client_name: 'Acme' } });
    const updated = invokeLocalFunction('manageProject', {
      action: 'update',
      project_id: data.project_id,
      project_data: { client_name: 'Umbrella', contract_value: 999 },
    });
    expect(updated.data.slug).toBe('umbrella');
    const project = read('Project')[0];
    expect(project.previous_slug).toBe('acme');
    expect(project.contract_value).toBe(999);
  });

  it('refuses to update a project that does not exist', () => {
    expect(() => invokeLocalFunction('manageProject', { action: 'update', project_id: 'nope', project_data: {} }))
      .toThrow(/לא נמצא/);
  });

  it('deletes a project and its child records', () => {
    const { data } = invokeLocalFunction('manageProject', {
      action: 'create',
      project_data: { client_name: 'Soylent' },
      client_highlights: [{ title: 'הערה', content: 'x' }],
    });
    invokeLocalFunction('deleteProjectCascade', { projectId: data.project_id });
    expect(read('Project')).toHaveLength(0);
    expect(read('ClientHighlight')).toHaveLength(0);
  });
});

describe('globalTabVisibility (local)', () => {
  beforeEach(() => localStorage.clear());

  it('persists a toggle across reads — the bug that made settings look dead', () => {
    invokeLocalFunction('globalTabVisibility', {
      action: 'set', settingKey: 'global_system_features', tabId: 'email_tracking', enabled: 'closed',
    });
    const { data } = invokeLocalFunction('globalTabVisibility', { settingKey: 'global_system_features' });
    expect(data.value.email_tracking).toBe('closed');
  });

  it('keeps setting keys isolated from each other', () => {
    invokeLocalFunction('globalTabVisibility', { action: 'set', settingKey: 'a', tabId: 'x', enabled: true });
    invokeLocalFunction('globalTabVisibility', { action: 'set', settingKey: 'b', tabId: 'y', enabled: false });
    expect(invokeLocalFunction('globalTabVisibility', { settingKey: 'a' }).data.value).toEqual({ x: true });
    expect(invokeLocalFunction('globalTabVisibility', { settingKey: 'b' }).data.value).toEqual({ y: false });
  });

  it('merges rather than replaces', () => {
    invokeLocalFunction('globalTabVisibility', { action: 'set', tabId: 'tasks', enabled: false });
    invokeLocalFunction('globalTabVisibility', { action: 'set', tabId: 'finance', enabled: true });
    expect(invokeLocalFunction('globalTabVisibility', {}).data.value).toEqual({ tasks: false, finance: true });
  });

  it('returns an empty object before anything was ever set', () => {
    expect(invokeLocalFunction('globalTabVisibility', { settingKey: 'nothing' }).data.value).toEqual({});
  });

  it('stores a mode string, not just a boolean', () => {
    invokeLocalFunction('globalTabVisibility', {
      action: 'set', settingKey: 'project_alerts_mode', tabId: 'project_alerts_mode', enabled: 'admin',
    });
    expect(
      invokeLocalFunction('globalTabVisibility', { settingKey: 'project_alerts_mode' }).data.value.project_alerts_mode
    ).toBe('admin');
  });
});

describe('directory (local)', () => {
  beforeEach(() => localStorage.clear());

  it('never returns password material', () => {
    invokeLocalFunction('manageTeamMember', {
      action: 'create',
      data: { name: 'דנה', email: 'dana@example.com', password_hash: 'H', password_salt: 'S', username: 'dana' },
    });
    const { data } = invokeLocalFunction('listTeamMembers', {});
    expect(data.members).toHaveLength(1);
    expect(data.members[0].username).toBe('dana');
    expect(data.members[0].password_hash).toBeUndefined();
    expect(data.members[0].password_salt).toBeUndefined();
  });
});

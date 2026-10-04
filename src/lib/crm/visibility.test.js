import { describe, it, expect } from 'vitest';
import { canSeeRecord, visibleRecords, visibleModuleRecords, scopeOf } from './visibility';

const OWNER_FIELD = { key: 'owner_email', type: 'person', by: 'email' };

const schemas = {
  open: { fields: [OWNER_FIELD] },
  mine: { scope: 'own', fields: [OWNER_FIELD] },
  byName: { scope: 'own', mineByName: ['participant'], fields: [{ key: 'participant', type: 'text' }] },
  staff: { scope: 'admin', fields: [OWNER_FIELD] },
  delivery: { scope: 'project', fields: [] },
};

const viewer = {
  isRealAdmin: false,
  email: 'me@example.com',
  fullName: 'דנה כהן',
  projectIds: new Set(['p1']),
};
const admin = { ...viewer, isRealAdmin: true };

describe('record visibility', () => {
  it('defaults to visible when a schema declares no scope', () => {
    expect(scopeOf(schemas.open)).toBe('all');
    expect(canSeeRecord({ owner_email: 'someone@else.com' }, schemas.open, viewer)).toBe(true);
  });

  it('scope own shows what you own and hides the rest', () => {
    expect(canSeeRecord({ owner_email: 'ME@Example.com ' }, schemas.mine, viewer)).toBe(true);
    expect(canSeeRecord({ owner_email: 'other@example.com' }, schemas.mine, viewer)).toBe(false);
  });

  it('scope own also covers records that name you rather than own you', () => {
    expect(canSeeRecord({ participant: 'דנה כהן' }, schemas.byName, viewer)).toBe(true);
    expect(canSeeRecord({ participant: 'יוסי לוי' }, schemas.byName, viewer)).toBe(false);
  });

  it('scope admin hides everything from everyone else', () => {
    expect(canSeeRecord({ owner_email: 'me@example.com' }, schemas.staff, viewer)).toBe(false);
    expect(canSeeRecord({ owner_email: 'other@example.com' }, schemas.staff, admin)).toBe(true);
  });

  it('scope project follows the project permission, and never strands orphans', () => {
    expect(canSeeRecord({ project_id: 'p1' }, schemas.delivery, viewer)).toBe(true);
    expect(canSeeRecord({ project_id: 'p9' }, schemas.delivery, viewer)).toBe(false);
    expect(canSeeRecord({ project_id: null }, schemas.delivery, viewer)).toBe(true);
  });

  it('an admin sees every scope', () => {
    for (const schema of Object.values(schemas)) {
      expect(canSeeRecord({ owner_email: 'x@y.z', project_id: 'p9' }, schema, admin)).toBe(true);
    }
  });

  it('filters lists with the same rule it answers single records with', () => {
    const rows = [{ owner_email: 'me@example.com' }, { owner_email: 'other@example.com' }];
    expect(visibleRecords(rows, schemas.mine, viewer)).toHaveLength(1);
    expect(visibleRecords(rows, schemas.mine, admin)).toHaveLength(2);
    expect(visibleRecords(null, schemas.mine, viewer)).toEqual([]);
  });

  it('applies the project permission model to modules that have no schema', () => {
    const projects = [{ id: 'p1' }, { id: 'p9' }];
    const tasks = [{ project_id: 'p1' }, { project_id: 'p9' }, { project_id: null }];
    expect(visibleModuleRecords('projects', projects, viewer, schemas)).toHaveLength(1);
    expect(visibleModuleRecords('tasks', tasks, viewer, schemas)).toHaveLength(2);
    expect(visibleModuleRecords('projects', projects, admin, schemas)).toHaveLength(2);
  });

  // A proposal carries a price, a discount and a margin. It was listed to
  // everyone who could log in on its own page, and dropped from global search
  // whenever it had no project — the same record leaking and lost at once.
  describe('a proposal — project when it has one, owner when it does not', () => {
    const see = (record, who = viewer) =>
      visibleModuleRecords('proposals', [record], who, schemas).length === 1;

    it('follows the project it belongs to', () => {
      expect(see({ project_id: 'p1', owner_email: 'other@example.com' })).toBe(true);
      expect(see({ project_id: 'p9', owner_email: 'me@example.com' })).toBe(false);
    });

    it('follows its owner when it belongs to no project', () => {
      expect(see({ owner_email: 'ME@Example.com ' })).toBe(true);
      expect(see({ created_by: 'me@example.com' })).toBe(true);
      expect(see({ owner_email: 'other@example.com' })).toBe(false);
      // Not owned, not in a project, and not admin: nothing to go on.
      expect(see({})).toBe(false);
    });

    it('is never hidden from an admin', () => {
      expect(see({ project_id: 'p9', owner_email: 'other@example.com' }, admin)).toBe(true);
      expect(see({}, admin)).toBe(true);
    });

    it('does not fall back to the catch-all "visible to everyone" rule', () => {
      // The bug this guards: without a rule of its own, a module with no schema
      // reaches visibleRecords(records, undefined, viewer), whose scope defaults
      // to 'all' — so every row is returned to everyone.
      expect(see({ owner_email: 'other@example.com', project_id: 'p9' })).toBe(false);
    });
  });
});

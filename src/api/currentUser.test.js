import { describe, it, expect, beforeEach } from 'vitest';
import { api } from './client';

// ─────────────────────────────────────────────────────────────────────────────
// The opening wizard could not be finished OR skipped: both buttons wrote the
// completion stamp, and the gate that reads it never saw the change.
//
// Two causes, both pinned here:
//   • `updateMe` mutated one module-level object and handed the SAME reference
//     back, so nothing downstream could tell that anything had changed;
//   • nothing was persisted, so a refresh put the wizard back on screen.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'onboarding_completed';

beforeEach(() => localStorage.clear());

describe('the signed-in user', () => {
  it('starts with the deployment owner and no onboarding stamp', async () => {
    const user = await api.auth.me();
    expect(user.role).toBe('admin');
    expect(user[KEY]).toBeUndefined();
  });

  it('reports a profile change back on the next read', async () => {
    await api.auth.updateMe({ [KEY]: '2026-09-09T00:00:00.000Z' });
    const user = await api.auth.me();
    expect(user[KEY]).toBe('2026-09-09T00:00:00.000Z');
  });

  it('hands back a NEW object each time — identity is how React notices', async () => {
    const before = await api.auth.me();
    const returned = await api.auth.updateMe({ [KEY]: 'now' });
    const after = await api.auth.me();

    expect(after).not.toBe(before);
    expect(returned).not.toBe(before);
    expect(before[KEY]).toBeUndefined();
    expect(after[KEY]).toBe('now');
  });

  it('survives a reload, so the wizard does not come back', async () => {
    await api.auth.updateMe({ [KEY]: 'stamped' });
    // What a fresh page load would find.
    const stored = JSON.parse(localStorage.getItem('oss_current_user'));
    expect(stored[KEY]).toBe('stamped');
  });

  it('merges rather than replaces, so one setting does not erase another', async () => {
    await api.auth.updateMe({ [KEY]: 'stamped' });
    await api.auth.updateMe({ ui_prefs: { density: 'compact' } });
    const user = await api.auth.me();
    expect(user[KEY]).toBe('stamped');
    expect(user.ui_prefs).toEqual({ density: 'compact' });
    expect(user.role).toBe('admin');
  });

  it('can be cleared again, which is what re-running the wizard does', async () => {
    await api.auth.updateMe({ [KEY]: 'stamped' });
    await api.auth.updateMe({ [KEY]: null });
    expect((await api.auth.me())[KEY]).toBeNull();
  });

  it('never throws when storage refuses to write', async () => {
    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('quota'); };
    await expect(api.auth.updateMe({ [KEY]: 'x' })).resolves.toBeTruthy();
    localStorage.setItem = original;
  });
});

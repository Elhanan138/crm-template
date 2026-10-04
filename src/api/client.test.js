import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { api } from './client';
import { invokeLocalFunction } from './localFunctions';

describe('function dispatch reaches its implementation', () => {
  beforeEach(() => localStorage.clear());

  it('no short-circuited default shadows a real implementation', () => {
    const client = fs.readFileSync(path.resolve(process.cwd(), 'src/api/client.js'), 'utf-8');
    const local = fs.readFileSync(path.resolve(process.cwd(), 'src/api/localFunctions.js'), 'utf-8');

    const block = client.slice(client.indexOf('const defaults = {'), client.indexOf('if (defaults[name])'));
    const shortCircuited = [...block.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    const implemented = new Set([...local.matchAll(/case '(\w+)'/g)].map((m) => m[1]));

    const shadowed = shortCircuited.filter((name) => implemented.has(name));
    expect(shadowed, 'these never reach their implementation').toEqual([]);
  });

  it('a settings toggle written through the client is read back through the client', async () => {
    await api.functions.invoke('globalTabVisibility', {
      action: 'set', settingKey: 'global_system_features', tabId: 'module:leads', enabled: 'closed',
    });
    const res = await api.functions.invoke('globalTabVisibility', { settingKey: 'global_system_features' });
    expect(res.data.value['module:leads']).toBe('closed');
  });

  it('the client and the dispatcher agree', async () => {
    invokeLocalFunction('globalTabVisibility', { action: 'set', tabId: 'x', enabled: 'admin' });
    const res = await api.functions.invoke('globalTabVisibility', {});
    expect(res.data.value.x).toBe('admin');
  });
});

describe('nothing in the shipped source references the old vendor', () => {
  // Built from parts so this file does not match its own check.
  const VENDOR = ['base', '44'].join('');

  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(path.resolve(process.cwd(), dir), { withFileTypes: true })) {
      if (['node_modules', 'dist', '.git', 'coverage'].includes(e.name)) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel, out);
      else if (/\.(jsx?|json|md|html|toml)$/.test(e.name) && e.name !== 'package-lock.json') out.push(rel);
    }
    return out;
  };

  it('no source, config or doc mentions it', () => {
    const offenders = walk('src')
      .concat(walk('tools'), walk('docs'), ['package.json', 'index.html', 'README.md'])
      .filter((f) => fs.existsSync(path.resolve(process.cwd(), f)))
      .filter((f) => f !== 'src/api/client.test.js')
      .filter((f) => new RegExp(VENDOR, 'i').test(fs.readFileSync(path.resolve(process.cwd(), f), 'utf-8')));
    expect(offenders).toEqual([]);
  });

  it('the client exports the api surface the app expects', async () => {
    const mod = await import('./client');
    expect(mod.api).toBeTruthy();
    for (const key of ['entities', 'functions', 'auth', 'integrations']) {
      expect(mod.api[key], `api.${key} missing`).toBeTruthy();
    }
  });
});

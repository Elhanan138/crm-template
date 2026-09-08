import { describe, it, expect } from 'vitest';
import { parseRepo, validatePublishInput, isBinary } from './github';

describe('repository parsing', () => {
  it('accepts owner/repo and full urls', () => {
    expect(parseRepo('acme/oss')).toEqual({ owner: 'acme', repo: 'oss' });
    expect(parseRepo('https://github.com/acme/oss')).toEqual({ owner: 'acme', repo: 'oss' });
    expect(parseRepo('https://github.com/acme/oss.git')).toEqual({ owner: 'acme', repo: 'oss' });
    expect(parseRepo('  acme/oss  ')).toEqual({ owner: 'acme', repo: 'oss' });
  });

  it('rejects anything else', () => {
    for (const bad of ['', 'acme', 'a/b/c', 'acme oss', null]) {
      expect(parseRepo(bad), String(bad)).toBeNull();
    }
  });
});

describe('publish input validation', () => {
  it('requires a repo and a token', () => {
    expect(validatePublishInput({ repo: '', token: 't' })).toMatch(/owner\/repo/);
    expect(validatePublishInput({ repo: 'a/b', token: '' })).toMatch(/טוקן/);
  });

  it('rejects a malformed branch name', () => {
    expect(validatePublishInput({ repo: 'a/b', token: 't', branch: 'bad branch' })).toMatch(/ענף/);
  });

  it('accepts a valid triple', () => {
    expect(validatePublishInput({ repo: 'a/b', token: 't', branch: 'feature/x' })).toBeNull();
    expect(validatePublishInput({ repo: 'a/b', token: 't' })).toBeNull();
  });
});

describe('binary detection', () => {
  it('sends images and fonts as blobs, everything else inline', () => {
    for (const p of ['public/icon-192.png', 'a/b.woff2', 'x.ico']) expect(isBinary(p)).toBe(true);
    for (const p of ['src/App.jsx', 'package.json', 'docs/X.md', 'a.css']) expect(isBinary(p)).toBe(false);
  });
});

describe('the token is never persisted', () => {
  // Comments explain WHY the token is not stored, so they must not be scanned.
  const codeOf = async (file) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    return fs.readFileSync(path.resolve(process.cwd(), file), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
  };

  it('no storage API appears in the publisher', async () => {
    expect(await codeOf('src/lib/github.js')).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });

  it('the export dialog never writes the token anywhere', async () => {
    const code = await codeOf('src/components/settings/ExportDialog.jsx');
    expect(code).toMatch(/token/);
    expect(code).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });

  it('the token is cleared once the push finishes', async () => {
    const code = await codeOf('src/components/settings/ExportDialog.jsx');
    expect(code).toMatch(/setGh\(\(g\) => \(\{ \.\.\.g, token: '' \}\)\)/);
  });
});

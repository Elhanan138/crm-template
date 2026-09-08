#!/usr/bin/env node
// Exhaustive export validation. planExport resolves the whole import graph and
// throws on anything that would not build, so running it across combinations is
// a real correctness check — not a smoke test.

import fs from 'fs';
import path from 'path';
import { planExport, OPTIONAL_FEATURES, extractSpecifiers, packageNameOf } from './export-core.js';

const root = process.cwd();
const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage']);

function listRepo(dir = '', out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) listRepo(rel, out);
    else out.push(rel);
  }
  return out;
}

// Builtins are always available and are never dependencies.
const NODE_BUILTINS = new Set([
  'fs', 'path', 'url', 'module', 'os', 'crypto', 'util', 'stream', 'events',
  'child_process', 'http', 'https', 'zlib', 'buffer', 'process',
]);

const allPaths = listRepo();
const pathSet = new Set(allPaths);
const has = (p) => pathSet.has(p);
const read = (p) => (pathSet.has(p) ? fs.readFileSync(path.join(root, p), 'utf-8') : null);

const manifest = read('src/lib/modules.js');
const MODULE_IDS = [...manifest.matchAll(/^ {2}(\w+): \{\n {4}label/gm)].map((m) => m[1]);
const FEATURES = Object.keys(OPTIONAL_FEATURES);
const SECTIONS = ['users', 'capabilities', 'system-features', 'custom-fields',
  'integrations', 'supabase', 'project-tabs', 'popups', 'notifications', 'branding'];

let pass = 0;
const failures = [];

function check(label, options) {
  try {
    const { textFiles, meta } = planExport({ has, read, allPaths, options });
    if (!textFiles.has('src/main.jsx')) throw new Error('entry point missing');
    if (!textFiles.has('package.json')) throw new Error('package.json missing');
    if (!textFiles.has('index.html')) throw new Error('index.html missing');
    if (meta.modules.length === 0) throw new Error('no modules selected');

    // Every bare import in the bundle must be a dependency the bundle declares.
    // Without this, a build only succeeds because a fatter node_modules happens
    // to be lying around.
    const pkg = JSON.parse(textFiles.get('package.json'));
    const declared = new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]);
    const missingDeps = new Set();
    for (const [file, content] of textFiles) {
      if (!/\.(jsx?|tsx?)$/.test(file)) continue;
      // Build config runs in Node, not in the bundle.
      if (file.startsWith('tools/') || !file.startsWith('src/')) continue;
      for (const spec of extractSpecifiers(content)) {
        const pkgName = packageNameOf(spec);
        if (pkgName && !NODE_BUILTINS.has(pkgName) && !declared.has(pkgName)) {
          missingDeps.add(`${pkgName} (${file})`);
        }
      }
    }
    if (missingDeps.size) throw new Error(`undeclared dependencies: ${[...missingDeps].slice(0, 4).join(', ')}`);

    pass++;
  } catch (err) {
    failures.push(`${label}: ${err.message.split('\n')[0]}`);
  }
}

console.log(`מודולים: ${MODULE_IDS.length} · תכונות: ${FEATURES.length} · מקטעים: ${SECTIONS.length}\n`);

// 1. every module on its own
for (const id of MODULE_IDS) check(`single:${id}`, { modules: [id] });

// 2. every pair
for (let i = 0; i < MODULE_IDS.length; i++) {
  for (let j = i + 1; j < MODULE_IDS.length; j++) {
    check(`pair:${MODULE_IDS[i]}+${MODULE_IDS[j]}`, { modules: [MODULE_IDS[i], MODULE_IDS[j]] });
  }
}

// 3. every module left out, one at a time
for (const id of MODULE_IDS) {
  check(`without:${id}`, { modules: MODULE_IDS.filter((m) => m !== id) });
}

// 4. every subset of the optional features, against the full module set
const featureSubsets = [];
for (let mask = 0; mask < 2 ** FEATURES.length; mask++) {
  featureSubsets.push(FEATURES.filter((_, i) => mask & (1 << i)));
}
for (const features of featureSubsets) {
  check(`features:[${features.join('|') || 'none'}]`, { features });
}

// 5. every settings section on its own, and each one left out
for (const section of SECTIONS) {
  check(`section:${section}`, { modules: ['settings'], settingsSections: [section] });
  check(`without-section:${section}`, {
    modules: ['settings'], settingsSections: SECTIONS.filter((s) => s !== section),
  });
}

// 6. the switches that change packaging, crossed with each other
for (const devTools of [true, false]) {
  for (const blankTemplate of [true, false]) {
    for (const features of [FEATURES, []]) {
      check(`flags:dev=${devTools},blank=${blankTemplate},feat=${features.length}`,
        { devTools, blankTemplate, features });
      check(`flags+single:dev=${devTools},blank=${blankTemplate},feat=${features.length}`,
        { modules: ['dashboard'], devTools, blankTemplate, features });
    }
  }
}

// 7. branding, with and without a logo
check('brand:named', { identity: { name: 'לקוח', subtitle: 'תת-כותרת' } });
check('brand:logo', { identity: { name: 'X', logo: 'data:image/png;base64,AA' } });
check('brand:empty-name', { identity: { name: '' } });

// 8. each workspace exported as a unit
const workspaces = {};
for (const [, id, parent] of manifest.matchAll(/^ {2}(\w+): \{\n {4}label:[^\n]*parent: '(\w+)'/gm)) {
  (workspaces[parent] ||= []).push(id);
}
for (const [ws, members] of Object.entries(workspaces)) {
  check(`workspace:${ws}`, { modules: members });
  check(`workspace+dash:${ws}`, { modules: ['dashboard', ...members] });
}

// 9. things that must be refused
const mustFail = [
  ['unknown module', { modules: ['does-not-exist'] }],
  ['module not in bundle', { modules: ['dashboard', 'nope'] }],
];
for (const [label, options] of mustFail) {
  try {
    planExport({ has, read, allPaths, options });
    failures.push(`${label}: should have been refused but was accepted`);
  } catch { pass++; }
}

console.log(`✔ ${pass} קומבינציות עברו`);
if (failures.length) {
  console.error(`\n✖ ${failures.length} נכשלו:`);
  for (const f of failures.slice(0, 25)) console.error('  ', f);
  process.exit(1);
}
console.log('כל הקומבינציות תקינות.');

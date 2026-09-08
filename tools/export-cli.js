#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// npm run export -- [options]
//
// Same engine as the "ייצוא (ZIP)" button in Settings, without needing the
// dev server or a browser. Useful in CI and for scripted, repeatable bundles.
//
//   npm run export
//   npm run export -- --modules=dashboard,tasks,settings
//   npm run export -- --modules=dashboard --sections=users,branding --out=lite.zip
//   npm run export -- --no-dev-tools        # lean bundle, cannot re-export
//   npm run export -- --no-agent            # ship without the AI agent
//   npm run export -- --blank               # empty template: no logo, no product name
//   npm run export -- --client="עיריית חיפה" --subtitle="מערכת פרויקטים"
//   npm run export -- --client="Acme" --logo=./acme.png
//   npm run export -- --features=agent      # explicit feature set
//   npm run export -- --list                # show module ids and exit
//
//   npm run export -- --github=owner/repo [--branch=main] [--message="..."]
//     Pushes the export into a repository instead of writing a zip.
//     Reads the token from GITHUB_TOKEN — never pass it on the command line,
//     where it would land in your shell history.
//
// npm run verify                             # validate every export combination
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { buildExportZip, planFromDisk } from './export-zip.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const list = (name) => (value(name) || '').split(',').map((s) => s.trim()).filter(Boolean);

const root = process.cwd();

if (flag('list')) {
  const src = fs.readFileSync(path.join(root, 'src/lib/modules.js'), 'utf-8');
  const ids = [...src.matchAll(/^\s{2}(\w+):\s*\{$/gm)].map((m) => m[1]);
  console.log('מודולים זמינים:\n' + ids.map((i) => `  • ${i}`).join('\n'));
  process.exit(0);
}

if (flag('help')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf-8').split('\n').slice(2, 15).join('\n').replace(/^\/\/ ?/gm, ''));
  process.exit(0);
}

const outPath = path.resolve(root, value('out') || 'oss-app.zip');

const exportOptions = {
    root,
    modules: list('modules'),
    settingsSections: list('sections'),
    devTools: !flag('no-dev-tools'),
    blankTemplate: flag('blank'),
    identity: value('client') !== null ? {
      name: value('client'),
      subtitle: value('subtitle') || '',
      logo: value('logo') ? `data:image/png;base64,${fs.readFileSync(path.resolve(root, value('logo'))).toString('base64')}` : '',
      company: {
        tagline: value('tagline') || '',
        legalId: value('legal-id') || '',
        address: value('address') || '',
        paymentTerms: value('payment-terms') || '',
        bank: value('bank') || '',
      },
    } : undefined,
    features: value('features') !== null
      ? list('features')
      : ['agent', 'email-tracking'].filter((f) => {
          if (f === 'agent' && flag('no-agent')) return false;
          if (f === 'email-tracking' && flag('no-email-tracking')) return false;
          return true;
        }),
};

try {
  if (value('github')) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('\n✖ חסר GITHUB_TOKEN בסביבה\n   export GITHUB_TOKEN=ghp_...\n');
      process.exit(1);
    }
    const { publishToGitHub } = await import('../src/lib/github.js');
    const plan = planFromDisk(exportOptions);
    const binaryFiles = new Map(
      plan.copyPaths.map((p) => [p, new Uint8Array(fs.readFileSync(path.join(root, p)))])
    );
    const result = await publishToGitHub({
      repo: value('github'),
      token,
      branch: value('branch') || 'main',
      message: value('message'),
      textFiles: plan.textFiles,
      binaryFiles,
      onProgress: (step) => console.log(`  · ${step}`),
    });
    console.log(`\n✔ ${result.files} קבצים נדחפו ל-${value('github')}`);
    console.log(`  ענף   : ${result.branch}`);
    console.log(`  קומיט : ${result.commit.slice(0, 7)}`);
    console.log(`  קלון  : git clone ${result.cloneUrl}\n`);
    process.exit(0);
  }

  const { buffer, meta } = await buildExportZip(exportOptions);
  fs.writeFileSync(outPath, buffer);

  const kb = (buffer.length / 1024).toFixed(0);
  console.log(`\n✔ ${path.relative(root, outPath)}  (${kb} KB)`);
  console.log(`  מודולים : ${meta.modules.join(', ')}`);
  console.log(`  קבצים   : ${meta.files}`);
  console.log(`  הושמטו  : ${meta.droppedDependencies.length} חבילות`);
  console.log(`  תכונות  : ${meta.features.length ? meta.features.join(', ') : 'ללא'}`);
  if (meta.blankTemplate) console.log('  תבנית   : ריקה — ללא לוגו וללא שם מוצר');
  if (meta.identity) console.log(`  מיתוג   : ${meta.identity.name}${meta.identity.hasLogo ? ' (עם לוגו)' : ''}`);
  console.log(`  כלי ייצוא בפנים: ${meta.devTools ? 'כן — אפשר לייצא הלאה מהחבילה' : 'לא'}\n`);
} catch (err) {
  console.error(`\n✖ הייצוא נעצר\n${err.message}\n`);
  process.exit(1);
}

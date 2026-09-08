// ─────────────────────────────────────────────────────────────────────────────
// EXPORT MANIFEST
//
// A bundle nobody can identify is a bundle nobody can support. After five
// customers, "which version is running where, and what is in it" has to have an
// answer that does not depend on anyone remembering.
//
// Every export therefore carries a version, a fingerprint of its own source,
// and a changelog describing exactly what it contains.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A stable fingerprint of everything the archive contains.
 *
 * djb2 over the sorted path list and the text contents — not cryptographic.
 * Its only job is to answer "is this the same bundle as that one".
 */
export function hashFiles(textFiles, copyPaths = []) {
  let hash = 5381;
  const feed = (value) => {
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
    }
  };
  for (const path of [...textFiles.keys()].sort()) {
    // The two files that describe the bundle cannot take part in describing
    // themselves, or the hash would never be reproducible.
    if (path === 'EXPORT.json' || path === 'CHANGELOG.md') continue;
    feed(path);
    feed(textFiles.get(path));
  }
  for (const path of [...copyPaths].sort()) feed(path);
  return hash.toString(16).padStart(8, '0');
}

/**
 * The version this bundle carries: the source's semver plus a build counter,
 * which is what distinguishes two exports of the same source that contain
 * different modules.
 */
export function exportVersion(baseVersion, build) {
  const base = /^\d+\.\d+\.\d+$/.test(String(baseVersion || '')) ? baseVersion : '0.0.0';
  const counter = Number.isFinite(Number(build)) && Number(build) > 0 ? Math.floor(Number(build)) : 1;
  return base + '+build.' + counter;
}

const list = (items) => (items && items.length ? items.join(', ') : '—');

/** A human-readable record of what this particular bundle is. */
export function changelogFor(meta) {
  const day = String(meta.exportedAt || '').slice(0, 10);
  return [
    '# יומן שינויים',
    '',
    'הקובץ הזה נוצר על ידי הייצוא ומתאר בדיוק מה נכלל בחבילה הזו.',
    '',
    '## ' + meta.version + ' — ' + day,
    '',
    '- מודולים (' + meta.modules.length + '): ' + list(meta.modules),
    '- תכונות: ' + list(meta.features),
    '- מקטעי הגדרות: ' + list(meta.settingsSections),
    '- קבצים: ' + meta.files,
    '- כלי פיתוח: ' + (meta.devTools ? 'נכללו' : 'הוסרו'),
    '- מיתוג: ' + (meta.blankTemplate ? 'תבנית ריקה' : (meta.identity && meta.identity.name) || 'ללא שינוי'),
    '- תלויות שנגזמו: ' + list(meta.droppedDependencies),
    '- טביעת אצבע של המקור: `' + meta.sourceHash + '`',
    '',
  ].join('\n');
}

/**
 * A plain-language summary of a plan, for showing BEFORE the archive is built.
 *
 * It is derived from the same plan the export actually runs, which is what
 * makes the preview and the ZIP incapable of disagreeing.
 */
export function describePlan(meta, { allModules = [], allSections = [] } = {}) {
  const dropped = (all, kept) => all.filter((id) => !kept.includes(id));
  return {
    version: meta.version,
    files: meta.files,
    modules: meta.modules,
    droppedModules: dropped(allModules, meta.modules),
    sections: meta.settingsSections,
    droppedSections: dropped(allSections, meta.settingsSections),
    features: meta.features,
    droppedDependencies: meta.droppedDependencies || [],
    devTools: meta.devTools,
    blankTemplate: meta.blankTemplate,
    sourceHash: meta.sourceHash,
  };
}

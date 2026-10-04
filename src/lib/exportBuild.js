// ─────────────────────────────────────────────────────────────────────────────
// EXPORT BUILD COUNTER
//
// Two bundles cut from the same source on the same day are not the same bundle:
// one may carry ten modules and the other three. The semver in package.json
// cannot tell them apart, so every export also carries a build number.
//
// It lives beside the rest of the local settings, counts up per deployment, and
// is deliberately advanced only AFTER an export succeeds — so the number shown
// in the preview is the number the archive will actually carry.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'export_build_counter';

const read = () => {
  try { return Number(localStorage.getItem(KEY)); } catch { return NaN; }
};

/** The build number the next export will use. */
export function currentBuild() {
  const value = read();
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

/** Record that a bundle went out, so the next one is distinguishable from it. */
export function advanceBuild() {
  const next = currentBuild() + 1;
  try { localStorage.setItem(KEY, String(next)); } catch { /* private mode — the version still holds */ }
  return next;
}

/** Start over — used when a deployment resets its history. */
export function resetBuild() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

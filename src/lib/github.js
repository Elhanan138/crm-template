// ─────────────────────────────────────────────────────────────────────────────
// GITHUB PUBLISH
//
// Pushes an export straight into a repository so the next step can be
// `git clone` and Claude Code, with no manual zip handling.
//
// Uses the Git Data API rather than the Contents API: the tree endpoint accepts
// file content inline, so an entire 300-file bundle is four requests, not three
// hundred. Binary assets are the only thing that needs its own blob call.
//
// The token is never stored. It lives in memory for the duration of the push
// and is gone on reload — a personal access token in localStorage is a
// credential sitting in every future XSS.
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://api.github.com';

const isBinary = (path) => /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|zip)$/i.test(path);

export function parseRepo(input) {
  const value = String(input || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  const match = value.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export function validatePublishInput({ repo, token, branch }) {
  if (!parseRepo(repo)) return 'שם המאגר חייב להיות בפורמט owner/repo';
  if (!String(token || '').trim()) return 'נדרש טוקן גישה';
  if (!/^[\w.\-/]+$/.test(String(branch || 'main'))) return 'שם ענף לא תקין';
  return null;
}

async function gh(token, path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    let message = `GitHub השיב ${response.status}`;
    if (response.status === 401) message = 'הטוקן נדחה — ודא שהוא בתוקף';
    if (response.status === 403) message = 'אין הרשאה — הטוקן צריך הרשאת כתיבה למאגר (scope: repo)';
    if (response.status === 404) message = 'המאגר לא נמצא, או שהטוקן לא רואה אותו';
    if (response.status === 422) message = 'GitHub דחה את הבקשה — ייתכן שהענף או המאגר ריקים';
    throw new Error(`${message}${detail ? `\n${detail.slice(0, 200)}` : ''}`);
  }
  return response.status === 204 ? null : response.json();
}

/**
 * Publish a set of files as one commit.
 *
 * @param {object}   opts
 * @param {string}   opts.repo      "owner/repo"
 * @param {string}   opts.token     personal access token with repo scope
 * @param {string}   opts.branch    target branch, default "main"
 * @param {string}   opts.message   commit message
 * @param {Map<string,string>} opts.textFiles  path → contents
 * @param {Map<string,Uint8Array|ArrayBuffer>} [opts.binaryFiles] path → bytes
 * @param {(step: string) => void} [opts.onProgress]
 */
export async function publishToGitHub({
  repo, token, branch = 'main', message, textFiles, binaryFiles = new Map(), onProgress = () => {},
}) {
  const error = validatePublishInput({ repo, token, branch });
  if (error) throw new Error(error);
  const { owner, repo: name } = parseRepo(repo);
  const base = `/repos/${owner}/${name}`;

  onProgress('בודק את המאגר');
  const meta = await gh(token, base);
  const targetBranch = branch || meta.default_branch || 'main';

  // An empty repository has no ref yet; that is a normal starting point.
  let parentSha = null;
  let baseTree;
  try {
    const ref = await gh(token, `${base}/git/ref/heads/${targetBranch}`);
    parentSha = ref.object.sha;
    const commit = await gh(token, `${base}/git/commits/${parentSha}`);
    baseTree = commit.tree.sha;
  } catch {
    onProgress('הענף עדיין לא קיים — נוצר עכשיו');
  }

  onProgress(`מעלה ${binaryFiles.size} נכסים בינאריים`);
  const blobs = [];
  for (const [path, bytes] of binaryFiles) {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    for (let i = 0; i < view.length; i += 0x8000) {
      binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
    }
    const blob = await gh(token, `${base}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: btoa(binary), encoding: 'base64' }),
    });
    blobs.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  onProgress(`בונה עץ עם ${textFiles.size + blobs.length} קבצים`);
  const tree = await gh(token, `${base}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      ...(baseTree ? { base_tree: baseTree } : {}),
      tree: [
        ...[...textFiles].map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
        ...blobs,
      ],
    }),
  });

  onProgress('יוצר קומיט');
  const commit = await gh(token, `${base}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: message || 'Export from the app',
      tree: tree.sha,
      ...(parentSha ? { parents: [parentSha] } : {}),
    }),
  });

  onProgress('מעדכן את הענף');
  if (parentSha) {
    await gh(token, `${base}/git/refs/heads/${targetBranch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } else {
    await gh(token, `${base}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${targetBranch}`, sha: commit.sha }),
    });
  }

  return {
    commit: commit.sha,
    branch: targetBranch,
    files: textFiles.size + blobs.length,
    url: `${meta.html_url}/tree/${targetBranch}`,
    cloneUrl: meta.clone_url,
  };
}

export { isBinary };

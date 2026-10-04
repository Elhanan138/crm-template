/**
 * Classifies a project fetch error into one of three categories:
 * - 'forbidden'  — 403 / permission denied
 * - 'not_found'  — 404
 * - 'network'    — everything else (timeout, 500, no status, null)
 *
 * @param {Error|null|undefined} error
 * @returns {'forbidden' | 'not_found' | 'network'}
 */
export function classifyProjectError(error) {
  if (!error) return 'network';

  // status can live in various places depending on the SDK / fetch layer
  const status =
    error.status ||
    error.statusCode ||
    error.response?.status ||
    error.response?.statusCode ||
    error.code;

  // Numeric status codes
  if (typeof status === 'number') {
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    return 'network';
  }

  // String status codes (e.g. "403")
  if (typeof status === 'string') {
    const num = parseInt(status, 10);
    if (!isNaN(num)) {
      if (num === 403) return 'forbidden';
      if (num === 404) return 'not_found';
      return 'network';
    }
    // Named error codes
    const lower = status.toLowerCase();
    if (lower.includes('forbidden') || lower.includes('permission') || lower.includes('access')) return 'forbidden';
    if (lower.includes('not_found') || lower.includes('notfound') || lower.includes('not found')) return 'not_found';
    return 'network';
  }

  // Inspect error message as last resort
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('403') || msg.includes('forbidden') || msg.includes('permission')) return 'forbidden';
  if (msg.includes('404') || msg.includes('not found') || msg.includes('notfound')) return 'not_found';

  return 'network';
}
/**
 * Basic client-side HTML sanitizer.
 * Removes script tags, event handlers, and javascript:/data:text/html URLs.
 * Preserves safe formatting tags (p, b, i, ul, etc.).
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const div = document.createElement('div');
  div.innerHTML = html;

  // Remove dangerous elements entirely
  div.querySelectorAll('script, iframe, object, embed, link, style, meta, base, form').forEach(el => el.remove());

  // Strip event handlers and dangerous attributes
  div.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase().trim();
      if (
        name.startsWith('on') ||
        value.startsWith('javascript:') ||
        value.startsWith('data:text/html') ||
        value.startsWith('vbscript:')
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return div.innerHTML;
}
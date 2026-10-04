// Pure logic for TipTap JSON documents — no React, no TipTap imports.

export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

const MAX_DEPTH = 50;

function nodeText(node, depth = 0) {
  if (!node || depth > MAX_DEPTH) return '';
  if (typeof node !== 'object') return '';
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'horizontalRule') return '';
  if (!Array.isArray(node.content)) return '';
  return node.content.map(child => nodeText(child, depth + 1)).join('');
}

export function docToPlainText(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) return '';
  return doc.content
    .map(node => nodeText(node))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isDocEmpty(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) return true;
  return doc.content.every(node => {
    if (node.type === 'horizontalRule') return false;
    const text = nodeText(node);
    return !text || !text.trim();
  });
}

export function docPreview(doc, maxChars = 100) {
  const text = docToPlainText(doc);
  if (!text) return '';
  if (text.length <= maxChars) return text;
  // Use Array.from to avoid splitting surrogate pairs
  const chars = Array.from(text);
  if (chars.length <= maxChars) return text;
  return chars.slice(0, maxChars).join('') + '...';
}
// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN EXPORT
//
// A note could be read only inside the system. Markdown is what every other
// tool — a wiki, an email, a repository, another notes app — accepts, so a
// page leaves as Markdown and arrives intact. Nodes this does not know are
// written as their plain text rather than dropped.
// ─────────────────────────────────────────────────────────────────────────────

const inlineMarkdown = (nodes = []) =>
  (nodes || []).map((node) => {
    if (node.type === 'hardBreak') return '  \n';
    if (node.type !== 'text') return nodeText(node);
    let text = node.text || '';
    const marks = new Set((node.marks || []).map((m) => m.type));
    if (marks.has('code')) text = `\`${text}\``;
    if (marks.has('bold')) text = `**${text}**`;
    if (marks.has('italic')) text = `*${text}*`;
    if (marks.has('strike')) text = `~~${text}~~`;
    const link = (node.marks || []).find((m) => m.type === 'link');
    if (link?.attrs?.href) text = `[${text}](${link.attrs.href})`;
    return text;
  }).join('');

function blockMarkdown(node, depth = 0) {
  if (!node || depth > MAX_DEPTH) return '';
  const indent = '  '.repeat(depth);
  const items = (list, marker) => (list.content || []).map((item, i) => {
    const [first, ...rest] = item.content || [];
    const head = `${indent}${marker(item, i)} ${inlineMarkdown(first?.content)}`;
    const nested = rest.map((child) => blockMarkdown(child, depth + 1)).filter(Boolean);
    return [head, ...nested].join('\n');
  }).join('\n');

  switch (node.type) {
    case 'heading': return `${'#'.repeat(Math.min(Math.max(node.attrs?.level || 1, 1), 6))} ${inlineMarkdown(node.content)}`;
    case 'paragraph': return inlineMarkdown(node.content);
    case 'bulletList': return items(node, () => '-');
    case 'orderedList': return items(node, (_item, i) => `${(node.attrs?.start || 1) + i}.`);
    case 'taskList': return items(node, (item) => `- [${item.attrs?.checked ? 'x' : ' '}]`);
    case 'blockquote': return (node.content || []).map((c) => `> ${blockMarkdown(c, depth)}`).join('\n');
    case 'codeBlock': return `\`\`\`\n${nodeText(node)}\n\`\`\``;
    case 'horizontalRule': return '---';
    default: return nodeText(node);
  }
}

/** A whole document as Markdown, with the page title as its first heading. */
export function docToMarkdown(doc, title = '') {
  const body = (doc?.content || []).map((node) => blockMarkdown(node)).join('\n\n')
    .replace(/\n{3,}/g, '\n\n').trim();
  return [title ? `# ${title}` : '', body].filter(Boolean).join('\n\n') + '\n';
}

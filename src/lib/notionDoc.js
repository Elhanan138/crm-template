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
// Pure logic for page tree operations — no React, no TipTap imports.

export function buildTree(pages) {
  if (!Array.isArray(pages)) return [];

  const childrenMap = {};
  const roots = [];

  for (const page of pages) {
    if (page.parent_page_id && pages.some(p => p.id === page.parent_page_id)) {
      if (!childrenMap[page.parent_page_id]) childrenMap[page.parent_page_id] = [];
      childrenMap[page.parent_page_id].push(page);
    } else {
      roots.push(page);
    }
  }

  roots.sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const id in childrenMap) {
    childrenMap[id].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  return roots.map(root => ({
    ...root,
    children: childrenMap[root.id] || [],
  }));
}

export function canNest(page, potentialParent, allPages) {
  if (!page || !potentialParent) return false;
  if (page.id === potentialParent.id) return false;
  // One level only — can't nest a page that already has children
  if (allPages.some(p => p.parent_page_id === page.id)) return false;
  // Can't create a cycle
  if (potentialParent.parent_page_id === page.id) return false;
  return true;
}

export function reorderPages(pages, pageId, direction) {
  if (!Array.isArray(pages) || !pageId) return pages;

  const sorted = [...pages].sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = sorted.findIndex(p => p.id === pageId);
  if (idx === -1) return pages;

  if (direction === 'up' && idx > 0) {
    [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
  } else if (direction === 'down' && idx < sorted.length - 1) {
    [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
  }
  // direction === null or same place → no swap

  return sorted.map((p, i) => ({ ...p, order: i }));
}
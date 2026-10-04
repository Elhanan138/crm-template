/**
 * Project slug utilities — generates readable, URL-safe slugs from project names.
 * Handles Hebrew transliteration so project URLs are always in English/Latin characters.
 */

import { api } from '@/api/client';

// Hebrew → Latin transliteration map
const HEBREW_MAP = {
  'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
  'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
  'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'e', 'פ': 'p', 'ף': 'p',
  'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
};

/**
 * Converts text to a URL-safe slug.
 * Transliterates Hebrew characters to Latin, lowercases, replaces spaces with hyphens.
 * @param {string} text
 * @returns {string} slug or empty string if input is empty/untransliterable
 */
export function slugify(text) {
  if (!text) return '';
  let result = String(text)
    .toLowerCase()
    .trim()
    // Keep Latin letters, digits, Hebrew, spaces, hyphens
    .replace(/[^a-z0-9\u0590-\u05FF\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Transliterate Hebrew characters
  result = result.replace(/[\u0590-\u05FF]/g, (ch) => HEBREW_MAP[ch] || '');

  // Clean up: spaces → hyphens, collapse multiple hyphens, trim leading/trailing
  result = result
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return result;
}

/**
 * Generates a slug for a project from its name/client_name.
 * Falls back through client_name → name → empty string.
 * @param {{ client_name?: string, name?: string, slug?: string }} project
 * @returns {string}
 */
export function generateProjectSlug(project) {
  if (!project) return '';
  if (project.slug) return project.slug;
  return slugify(project.client_name || project.name || '');
}

/**
 * Returns the project detail path using the slug (or ID as fallback).
 * @param {{ id: string, slug?: string, client_name?: string, name?: string }} project
 * @returns {string}
 */
export function getProjectPath(project) {
  if (!project) return '/projects';
  const slug = generateProjectSlug(project);
  return `/projects/${slug || project.id}`;
}

/**
 * Returns the project edit path using the slug (or ID as fallback).
 * @param {{ id: string, slug?: string, client_name?: string, name?: string }} project
 * @returns {string}
 */
export function getProjectEditPath(project) {
  if (!project) return '/projects';
  const slug = generateProjectSlug(project);
  return `/projects/${slug || project.id}/edit`;
}

/**
 * Checks if a string looks like a MongoDB ObjectId (24 hex chars).
 * @param {string} str
 * @returns {boolean}
 */
export function isObjectId(str) {
  return typeof str === 'string' && /^[a-f0-9]{24}$/.test(str);
}

/**
 * Resolves a project from a URL ref (slug or ObjectId).
 * Checks react-query cache first, then falls back to filter/get.
 *
 * @param {string} ref — slug or ObjectId from the URL
 * @param {{ queryClient?: any }} opts
 * @returns {Promise<object|null>} — the project object, or null if not found/no access
 */
export async function resolveProjectRef(ref, opts = {}) {
  if (!ref) return null;

  const { queryClient } = opts;

  // 1. Check cache (projects list) — instant, no network
  if (queryClient) {
    const cached = queryClient.getQueryData(['projects']);
    if (Array.isArray(cached)) {
      const found = cached.find(p => p.id === ref || p.slug === ref);
      if (found) return found;
    }
    const cachedMeta = queryClient.getQueryData(['projectsCreatorMeta']);
    if (Array.isArray(cachedMeta)) {
      const found = cachedMeta.find(p => p.id === ref || p.slug === ref);
      if (found) return found;
    }
  }

  // 2. ObjectId → direct get
  if (isObjectId(ref)) {
    try {
      return await api.entities.Project.get(ref);
    } catch {
      return null;
    }
  }

  // 3. Slug → filter
  try {
    const results = await api.entities.Project.filter({ slug: ref });
    if (results && results.length > 0) return results[0];
  } catch {
    // filter failed — fall through
  }

  // 4. Fallback: try as ID (non-standard ID or previous_slug)
  try {
    return await api.entities.Project.get(ref);
  } catch {
    return null;
  }
}

/**
 * Returns a project path from just a project ID, checking the react-query cache first.
 * If the project isn't in cache, falls back to `/projects/${id}` — the canonical
 * redirect in ProjectDetail will resolve it to the slug-based URL.
 *
 * @param {string} projectId
 * @param {any} queryClient
 * @returns {string}
 */
export function getProjectPathFromId(projectId, queryClient) {
  if (!projectId) return '/projects';
  if (queryClient) {
    const cached = queryClient.getQueryData(['projects']);
    if (Array.isArray(cached)) {
      const found = cached.find(p => p.id === projectId);
      if (found) return getProjectPath(found);
    }
    const cachedMeta = queryClient.getQueryData(['projectsCreatorMeta']);
    if (Array.isArray(cachedMeta)) {
      const found = cachedMeta.find(p => p.id === projectId);
      if (found) return getProjectPath(found);
    }
  }
  return `/projects/${projectId}`;
}
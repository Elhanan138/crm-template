export const MAX_IMAGES = 4;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate a list of files for image attachment.
 * Rules: only image/* types, max 5MB per file, max MAX_IMAGES total.
 *
 * @param {File[]} files
 * @param {number} existingCount - number of images already attached
 * @returns {{ valid: File[], errors: string[] }}
 */
export function validateImageFiles(files, existingCount = 0) {
  const valid = [];
  const errors = [];
  const fileArray = Array.from(files || []);

  for (const file of fileArray) {
    if (!file.type || !file.type.startsWith('image/')) {
      errors.push(`"${file.name}" אינו קובץ תמונה`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`"${file.name}" חורג מגודל מירבי של 5MB`);
      continue;
    }
    valid.push(file);
  }

  const remainingSlots = MAX_IMAGES - existingCount;
  if (remainingSlots <= 0) {
    return { valid: [], errors: [...errors, `ניתן לצרף עד ${MAX_IMAGES} תמונות לתגובה`] };
  }
  if (valid.length > remainingSlots) {
    const accepted = valid.slice(0, remainingSlots);
    return { valid: accepted, errors: [...errors, `ניתן לצרף עד ${MAX_IMAGES} תמונות לתגובה`] };
  }

  return { valid, errors };
}

/**
 * Extract image files from a ClipboardData or DataTransfer object.
 * Returns only files whose type starts with image/, ignoring text and other data.
 *
 * @param {DataTransfer | ClipboardEvent['clipboardData']} clipboardData
 * @returns {File[]}
 */
export function extractImagesFromClipboard(clipboardData) {
  if (!clipboardData) return [];
  const files = [];

  // Prefer the files array (most reliable)
  if (clipboardData.files && clipboardData.files.length > 0) {
    for (const file of clipboardData.files) {
      if (file.type && file.type.startsWith('image/')) files.push(file);
    }
    return files;
  }

  // Fall back to the items API
  if (clipboardData.items && clipboardData.items.length > 0) {
    for (const item of clipboardData.items) {
      if (item.kind === 'file' && item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }

  return files;
}
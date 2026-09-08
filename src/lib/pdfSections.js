export const PDF_SECTIONS = [
  { id: 'overview', label: 'סקירת פרויקט' },
  { id: 'project-life', label: 'חיי פרויקט' },
  { id: 'tasks', label: 'משימות' },
  { id: 'gantt', label: 'גאנט' },
  { id: 'meetings', label: 'פגישות והדרכות' },
  { id: 'quotes', label: 'הצעות מחיר' },
  { id: 'rates', label: 'תעריפים' },
  { id: 'notes', label: 'הערות' },
];

export const ALL_SECTION_IDS = PDF_SECTIONS.map(s => s.id);

/**
 * Normalizes a section selection — fills defaults if empty,
 * filters out invalid IDs.
 */
export function normalizeSections(selected) {
  if (!Array.isArray(selected) || selected.length === 0) {
    return [...ALL_SECTION_IDS];
  }
  const valid = new Set(ALL_SECTION_IDS);
  return selected.filter(id => valid.has(id));
}

/**
 * Returns true if the selection has at least one valid section.
 */
export function isValidSections(selected) {
  if (!Array.isArray(selected)) return false;
  return selected.length > 0;
}

/**
 * Builds a PDF filename: {clientName}_דוח_{YYYY-MM-DD}.pdf
 * Cleans forbidden filesystem characters and handles Hebrew.
 */
export function buildPdfFilename(clientName, date = new Date()) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  const cleanName = (clientName || 'פרויקט')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'פרויקט';

  return `${cleanName}_דוח_${yyyy}-${mm}-${dd}.pdf`;
}
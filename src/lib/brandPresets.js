// ─────────────────────────────────────────────────────────────────────────────
// BRAND PRESETS
//
// A customer given a colour picker picks badly — a colour that fails contrast
// on a button, or one that fights every status tone in the system. Six presets,
// each chosen to sit correctly against the semantic palette in both themes,
// with the free picker still there for whoever really wants it.
//
// Only the brand hue is defined. Everything else in the system is a token, so a
// preset never has to name a second colour to stay coherent.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND_PRESETS = [
  { id: 'slate',   label: 'סלייט',   primary: '#2d3436', hint: 'ברירת המחדל — כהה, נייטרלי' },
  { id: 'indigo',  label: 'אינדיגו', primary: '#4338ca', hint: 'טכנולוגי, רשמי' },
  { id: 'teal',    label: 'טורקיז',  primary: '#0f766e', hint: 'שירות, בריאות' },
  { id: 'plum',    label: 'שזיף',    primary: '#7e22ce', hint: 'יצירתי, מותג צעיר' },
  { id: 'ember',   label: 'ענבר',    primary: '#b45309', hint: 'תעשייה, לוגיסטיקה' },
  { id: 'crimson', label: 'ארגמן',   primary: '#be123c', hint: 'קמעונאות, אנרגטי' },
];

export const presetById = (id) => BRAND_PRESETS.find((p) => p.id === id) || null;

/** Which preset a stored brand colour corresponds to, if any. */
export const presetForColor = (hex) =>
  BRAND_PRESETS.find((p) => p.primary.toLowerCase() === String(hex || '').toLowerCase()) || null;

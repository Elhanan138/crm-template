// ─────────────────────────────────────────────────────────────────────────────
// BRAND PRESETS
//
// A customer given a colour picker picks badly — a colour that fails contrast
// on a button, or one that fights every status tone in the system. Six presets,
// each chosen to sit correctly against the semantic palette in both themes,
// with the free picker still there for whoever really wants it.
//
// This is the ONLY list of presets. The onboarding wizard and the branding
// panel both read it: a seventh preset is one line here and appears in both,
// and the two can never drift into offering different sets of colours.
//
// `primary` is the brand colour itself — everything else in the system is a
// token, so a preset never has to name a second colour to stay coherent.
// `palette` is the three swatches offered alongside it for accents in charts
// and documents, where a single hue is not enough to tell two things apart.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND_PRESETS = [
  {
    id: 'slate',
    label: 'סלייט',
    hint: 'ברירת המחדל — כהה, נייטרלי',
    primary: '#2d3436',
    palette: ['#2d3436', '#0984e3', '#00b894'],
  },
  {
    id: 'indigo',
    label: 'אינדיגו',
    hint: 'טכנולוגי, רשמי',
    primary: '#4338ca',
    palette: ['#4338ca', '#6366f1', '#0891b2'],
  },
  {
    id: 'teal',
    label: 'טורקיז',
    hint: 'שירות, בריאות',
    primary: '#0f766e',
    palette: ['#0f766e', '#14b8a6', '#0369a1'],
  },
  {
    id: 'plum',
    label: 'שזיף',
    hint: 'יצירתי, מותג צעיר',
    primary: '#7e22ce',
    palette: ['#7e22ce', '#a21caf', '#6d28d9'],
  },
  {
    id: 'ember',
    label: 'ענבר',
    hint: 'תעשייה, לוגיסטיקה',
    primary: '#b45309',
    palette: ['#b45309', '#d97706', '#c2410c'],
  },
  {
    id: 'crimson',
    label: 'ארגמן',
    hint: 'קמעונאות, אנרגטי',
    primary: '#be123c',
    palette: ['#be123c', '#db2777', '#f59e0b'],
  },
];

export const presetById = (id) => BRAND_PRESETS.find((p) => p.id === id) || null;

/** Which preset a stored brand colour corresponds to, if any. */
export const presetForColor = (hex) =>
  BRAND_PRESETS.find((p) => p.primary.toLowerCase() === String(hex || '').toLowerCase()) || null;

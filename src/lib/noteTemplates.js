// ─────────────────────────────────────────────────────────────────────────────
// NOTE TEMPLATES
//
// A blank page is where meeting notes go to be inconsistent: one person writes
// decisions at the top, another buries the action items in paragraph three,
// and nobody can find "what did we agree" a month later. A template is the
// structure agreed once — the same headings, in the same order, every time.
//
// Each is an ordinary TipTap document, so the page it creates is a normal page
// that can be edited freely. The structure is a starting point, not a form.
// ─────────────────────────────────────────────────────────────────────────────

const text = (value) => (value ? [{ type: 'text', text: value }] : undefined);
const heading = (value, level = 2) => ({ type: 'heading', attrs: { level }, content: text(value) });
const paragraph = (value = '') => ({ type: 'paragraph', content: text(value) });
const bullets = (lines) => ({
  type: 'bulletList',
  content: lines.map((line) => ({ type: 'listItem', content: [paragraph(line)] })),
});
const tasks = (lines) => ({
  type: 'taskList',
  content: lines.map((line) => ({ type: 'taskItem', attrs: { checked: false }, content: [paragraph(line)] })),
});
const doc = (...content) => ({ type: 'doc', content });

export const NOTE_TEMPLATES = [
  {
    id: 'meeting',
    label: 'סיכום פגישה',
    icon: '🗓️',
    doc: doc(
      heading('משתתפים'), bullets(['']),
      heading('נושאים'), bullets(['']),
      heading('החלטות'), bullets(['']),
      heading('משימות להמשך'), tasks(['']),
    ),
  },
  {
    id: 'kickoff',
    label: 'פגישת התנעה',
    icon: '🚀',
    doc: doc(
      heading('מטרות הפרויקט'), bullets(['']),
      heading('תכולה — מה בפנים ומה בחוץ'), bullets(['']),
      heading('אנשי קשר ואחראים'), bullets(['']),
      heading('אבני דרך'), bullets(['']),
      heading('סיכונים ידועים'), bullets(['']),
      heading('צעדים ראשונים'), tasks(['']),
    ),
  },
  {
    id: 'retro',
    label: 'רטרוספקטיבה',
    icon: '🔁',
    doc: doc(
      heading('מה עבד טוב'), bullets(['']),
      heading('מה לא עבד'), bullets(['']),
      heading('מה נעשה אחרת'), tasks(['']),
    ),
  },
  {
    id: 'call',
    label: 'שיחת לקוח',
    icon: '📞',
    doc: doc(
      heading('הלקוח והקשר'), paragraph(),
      heading('מה עלה בשיחה'), bullets(['']),
      heading('צרכים וחששות'), bullets(['']),
      heading('הצעד הבא'), tasks(['']),
    ),
  },
];

export const noteTemplate = (id) => NOTE_TEMPLATES.find((t) => t.id === id) || null;

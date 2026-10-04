// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE TEMPLATES
//
// Every recruiter writes the same four emails all week: come for a screening
// call, come for an interview, here is an offer, thank you but no. Each was
// typed from scratch, which is how a candidate ends up addressed by the wrong
// name or invited to the wrong role.
//
// A template is declared once against the stage it belongs to and opens in the
// user's own mail client, already addressed and filled in. It goes out from a
// real mailbox, so it needs no server and leaves no sending to pretend about.
//
// The text is the message a candidate receives, so it stays in the language
// it is written in — like a printed quote, it is not translated with the UI.
// ─────────────────────────────────────────────────────────────────────────────

export const RECRUITING_TEMPLATES = [
  {
    key: 'screening',
    stage: 'screening',
    label: 'הזמנה לשיחת סינון',
    subject: 'שיחת היכרות — {{position}}',
    body: 'שלום {{full_name}},\n\nתודה על מועמדותך למשרת {{position}}. נשמח לתאם שיחת היכרות קצרה של כ-20 דקות.\nמתי נוח לך השבוע?\n\nבברכה',
  },
  {
    key: 'interview',
    stage: 'interview',
    label: 'הזמנה לראיון',
    subject: 'הזמנה לראיון — {{position}}',
    body: 'שלום {{full_name}},\n\nנשמח להזמין אותך לראיון למשרת {{position}}.\nאנא אשר/י את המועד המתאים לך ונשלח פרטים.\n\nבברכה',
  },
  {
    key: 'offer',
    stage: 'offer',
    label: 'הצעת עבודה',
    subject: 'הצעת עבודה — {{position}}',
    body: 'שלום {{full_name}},\n\nשמחים להציע לך את משרת {{position}}. מצורפים פרטי ההצעה.\nנשמח לשמוע ממך.\n\nבברכה',
  },
  {
    key: 'rejected',
    stage: 'rejected',
    label: 'עדכון על החלטה',
    subject: 'עדכון לגבי מועמדותך — {{position}}',
    body: 'שלום {{full_name}},\n\nתודה על הזמן וההשקעה בתהליך למשרת {{position}}. בשלב זה החלטנו להתקדם עם מועמד/ת אחר/ת.\nנשמור את פרטיך לתפקידים עתידיים.\n\nבברכה',
  },
];

/** `{{key}}` replaced from the record; a missing value becomes empty, never "undefined". */
export const fillTemplate = (text, record) =>
  String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(record?.[key] ?? '').trim());

/** A mailto link with the template filled in for one record. */
export function mailtoFor(template, record) {
  const to = String(record?.email || '').trim();
  const params = new URLSearchParams({
    subject: fillTemplate(template.subject, record),
    body: fillTemplate(template.body, record),
  });
  // URLSearchParams encodes a space as "+", which most mail clients show
  // literally in a mailto body. %20 is what they all understand.
  return `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, '%20')}`;
}

import { normalizeHebrew } from '@/lib/hebrewSearch';

// Normalize geresh (׳ U+05F3) to apostrophe (') for consistent matching
function normalizeForSearch(s) {
  return normalizeHebrew(s).replace(/\u05F3/g, "'");
}

export const SLASH_COMMANDS = [
  {
    id: 'paragraph',
    label: 'פסקה',
    description: 'טקסט רגיל',
    icon: 'AlignRight',
    aliases: ['פסקה', 'טקסט', 'paragraph', 'text'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: 'heading1',
    label: 'כותרת 1',
    description: 'כותרת גדולה',
    icon: 'Heading1',
    aliases: ['כותרת 1', 'כותרת גדולה', 'h1', 'heading', 'title'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'כותרת 2',
    description: 'כותרת בינונית',
    icon: 'Heading2',
    aliases: ['כותרת 2', 'כותרת בינונית', 'h2', 'heading 2', 'subtitle'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'כותרת 3',
    description: 'כותרת קטנה',
    icon: 'Heading3',
    aliases: ['כותרת 3', 'כותרת קטנה', 'h3', 'heading 3'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bulletList',
    label: 'רשימת תבליטים',
    description: 'רשימה עם נקודות',
    icon: 'List',
    aliases: ['תבליטים', 'רשימת תבליטים', 'רשימה', 'רשימות', 'bullet', 'list', 'unordered'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    label: 'רשימה ממוספרת',
    description: 'רשימה עם מספרים',
    icon: 'ListOrdered',
    aliases: ['ממוספרת', 'רשימה ממוספרת', 'מספור', 'ordered', 'numbered', 'number list'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    label: 'רשימת משימות',
    description: 'רשימה עם צ׳קבוקס',
    icon: 'ListChecks',
    aliases: ['משימות', "צ'קליסט", 'צ׳קליסט', 'צקליסט', 'תיבות סימון', 'todo', 'task', 'check', 'checkbox'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    label: 'ציטוט',
    description: 'בלוק ציטוט',
    icon: 'Quote',
    aliases: ['ציטוט', 'הדגשה', 'quote', 'blockquote'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'קוד',
    description: 'בלוק קוד',
    icon: 'Code2',
    aliases: ['קוד', 'code', 'codeblock', 'code block', 'snippet'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'horizontalRule',
    label: 'קו מפריד',
    description: 'קו אופקי',
    icon: 'Minus',
    aliases: ['קו מפריד', 'קו', 'מפריד', 'divider', 'hr', 'horizontal rule', 'separator'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export function filterCommands(query) {
  if (!query || !query.trim()) return SLASH_COMMANDS;
  const q = normalizeForSearch(query);
  if (!q) return SLASH_COMMANDS;

  const scored = SLASH_COMMANDS.map(cmd => {
    const aliases = cmd.aliases.map(a => normalizeForSearch(a));
    let score = 0;
    for (const a of aliases) {
      if (a === q) { score = 100; break; }
      if (a.startsWith(q)) { score = Math.max(score, 80); }
      if (a.includes(q)) { score = Math.max(score, 50); }
    }
    // Fallback: try with trimmed query (handles extra final letters like רשימם → רשימ)
    if (score === 0 && q.length > 3) {
      const qTrimmed = q.slice(0, -1);
      for (const a of aliases) {
        if (a.startsWith(qTrimmed)) { score = 40; break; }
      }
    }
    return { cmd, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.cmd);
}
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Code2, Link as LinkIcon,
  AlignRight, AlignCenter, AlignLeft, AlignJustify,
} from 'lucide-react';

const ALIGNMENTS = [
  { value: 'right', icon: AlignRight, label: 'יישור לימין' },
  { value: 'center', icon: AlignCenter, label: 'מרכוז' },
  { value: 'left', icon: AlignLeft, label: 'יישור לשמאל' },
  { value: 'justify', icon: AlignJustify, label: 'יישור דו-צדדי' },
];

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('קישור:', prev || '');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btn = (active) =>
    `h-8 w-8 ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`;

  const Sep = () => <div className="w-px h-4 bg-border mx-0.5" />;

  return (
    <div className="flex items-center px-2 py-1 border-b border-border" dir="ltr">
      <Button variant="ghost" size="icon" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="מודגש" title="מודגש">
        <Bold className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="נטוי" title="נטוי">
        <Italic className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="קו תחתון" title="קו תחתון">
        <Underline className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="קו חוצה" title="קו חוצה">
        <Strikethrough className="w-3.5 h-3.5" />
      </Button>
      <Sep />
      <Button variant="ghost" size="icon" className={btn(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="כותרת 1" title="כותרת 1">
        <Heading1 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="כותרת 2" title="כותרת 2">
        <Heading2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="כותרת 3" title="כותרת 3">
        <Heading3 className="w-3.5 h-3.5" />
      </Button>
      <Sep />
      <Button variant="ghost" size="icon" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="רשימה" title="רשימה">
        <List className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="רשימה ממוספרת" title="רשימה ממוספרת">
        <ListOrdered className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('taskList'))} onClick={() => editor.chain().focus().toggleTaskList().run()} aria-label="משימות" title="משימות">
        <ListChecks className="w-3.5 h-3.5" />
      </Button>
      <Sep />
      {ALIGNMENTS.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon"
          className={btn(editor.isActive({ textAlign: value }))}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
          aria-label={label}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
        </Button>
      ))}
      <Sep />
      <Button variant="ghost" size="icon" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="ציטוט" title="ציטוט">
        <Quote className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('codeBlock'))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="קוד" title="קוד">
        <Code2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('link'))} onClick={setLink} aria-label="קישור" title="קישור">
        <LinkIcon className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
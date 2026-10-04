import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline, List, ListChecks, Link as LinkIcon, Undo, Redo,
  AlignRight, AlignCenter, AlignLeft,
} from 'lucide-react';
import BlockTypeSelect from './BlockTypeSelect';

export default function MobileToolbar({ editor }) {
  const [bottom, setBottom] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!window.visualViewport) return;
    const update = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        setBottom(window.innerHeight - vv.height - vv.offsetTop);
      });
    };
    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);
    update();
    return () => {
      window.visualViewport.removeEventListener('resize', update);
      window.visualViewport.removeEventListener('scroll', update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('קישור:', prev || '');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btnClass = (active) =>
    `h-11 w-11 flex-shrink-0 ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`;

  return (
    <div
      className="sticky bottom-0 bg-card border-t border-border p-1.5 flex items-center gap-0.5 overflow-x-auto"
      style={{ marginBottom: `${bottom}px` }}
    >
      <div className="flex-shrink-0">
        <BlockTypeSelect editor={editor} />
      </div>
      <div className="w-px h-6 bg-border mx-0.5 flex-shrink-0" />
      <Button variant="ghost" size="icon" className={btnClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="מודגש" title="מודגש">
        <Bold className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className={btnClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="נטוי" title="נטוי">
        <Italic className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className={btnClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="קו תחתון" title="קו תחתון">
        <Underline className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-0.5 flex-shrink-0" />
      {[
        { value: 'right', Icon: AlignRight, label: 'יישור לימין' },
        { value: 'center', Icon: AlignCenter, label: 'מרכוז' },
        { value: 'left', Icon: AlignLeft, label: 'יישור לשמאל' },
      ].map(({ value, Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon"
          className={btnClass(editor.isActive({ textAlign: value }))}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
          aria-label={label}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </Button>
      ))}
      <div className="w-px h-6 bg-border mx-0.5 flex-shrink-0" />
      <Button variant="ghost" size="icon" className={btnClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="רשימה" title="רשימה">
        <List className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className={btnClass(editor.isActive('taskList'))} onClick={() => editor.chain().focus().toggleTaskList().run()} aria-label="משימות" title="משימות">
        <ListChecks className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className={btnClass(editor.isActive('link'))} onClick={setLink} aria-label="קישור" title="קישור">
        <LinkIcon className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-0.5 flex-shrink-0" />
      <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0 text-muted-foreground" onClick={() => editor.chain().focus().undo().run()} aria-label="ביטול" title="ביטול" disabled={!editor.can().undo()}>
        <Undo className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0 text-muted-foreground" onClick={() => editor.chain().focus().redo().run()} aria-label="חזרה" title="חזרה" disabled={!editor.can().redo()}>
        <Redo className="w-4 h-4" />
      </Button>
    </div>
  );
}
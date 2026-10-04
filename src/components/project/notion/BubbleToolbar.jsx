import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Code } from 'lucide-react';

/**
 * Custom floating toolbar — replaces @tiptap/react BubbleMenu (tippy.js)
 * to avoid removeChild crashes during React reconciliation.
 */
export default function BubbleToolbar({ editor }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rafRef = useRef(null);

  const update = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!editor) return;
      const { from, to, empty } = editor.state.selection;
      if (empty || editor.isDestroyed) {
        setVisible(false);
        return;
      }
      // Check if selection is within the editor's DOM
      const editorEl = editor.view.dom;
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const editorRect = editorEl.getBoundingClientRect();

      // Only show if selection is within the editor viewport
      if (end.top < 0 || start.top > window.innerHeight) {
        setVisible(false);
        return;
      }

      setVisible(true);
      const top = Math.min(start.top, end.top) - window.scrollY - 48;
      const left = (start.left + end.left) / 2 - window.scrollX - 120;
      setPos({ top: Math.max(8, top), left: Math.max(8, left) });
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, update]);

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('קישור:', prev || '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor || !visible) return null;

  return (
    <div
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-md p-1 flex items-center gap-0.5"
      style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
    >
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="מודגש"
        title="מודגש"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="נטוי"
        title="נטוי"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive('underline') ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="קו תחתון"
        title="קו תחתון"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Underline className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive('strike') ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="קו חוצה"
        title="קו חוצה"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Strikethrough className="w-4 h-4" />
      </Button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive('link') ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={setLink}
        aria-label="קישור"
        title="קישור"
        onMouseDown={(e) => e.preventDefault()}
      >
        <LinkIcon className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${editor.isActive('code') ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        aria-label="קוד"
        title="קוד"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Code className="w-4 h-4" />
      </Button>
    </div>
  );
}
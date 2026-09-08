import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { filterCommands } from '@/lib/slashCommands';
import { EMPTY_DOC, docToPlainText } from '@/lib/notionDoc';
import { useIsMobile } from '@/hooks/use-mobile';
import SlashMenu from './SlashMenu';
import BubbleToolbar from './BubbleToolbar';
import MobileToolbar from './MobileToolbar';
import EditorToolbar from './EditorToolbar';

export default function NotionEditor({ page, onChange }) {
  const isMobile = useIsMobile();
  const [slashMenu, setSlashMenu] = useState(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const slashExtension = useMemo(() => {
    return Extension.create({
      name: 'slashCommand',
      addProseMirrorPlugins() {
        return [
          Suggestion({
            editor: this.editor,
            char: '/',
            startOfLine: false,
            items: ({ query }) => filterCommands(query),
            command: ({ editor, range, props }) => {
              props.command({ editor, range });
            },
            render: () => ({
              onStart: (props) => setSlashMenu(props),
              onUpdate: (props) => setSlashMenu(prev => prev ? { ...prev, ...props } : props),
              onKeyDown: () => false,
              onExit: () => setSlashMenu(null),
            }),
          }),
        ];
      },
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['right', 'center', 'left', 'justify'],
        defaultAlignment: 'right',
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({
        placeholder: "התחל לכתוב, או הקלד / לפקודות…",
      }),
      slashExtension,
    ],
    content: page?.content_json || EMPTY_DOC,
    editorProps: {
      attributes: {
        dir: 'rtl',
        class: 'prose-mirror-content',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const text = docToPlainText(json);
      onChangeRef.current?.({ content_json: json, content_text: text });
    },
  });

  const closeSlashMenu = useCallback(() => setSlashMenu(null), []);

  if (!editor) {
    return <div className="bg-card border border-border rounded-lg shadow-sm min-h-[300px] animate-pulse" />;
  }

  return (
    <div className="notion-editor bg-card border border-border rounded-lg shadow-sm flex flex-col min-h-0" dir="rtl">
      {!isMobile && <EditorToolbar editor={editor} />}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      {!isMobile && <BubbleToolbar editor={editor} />}
      {isMobile && <MobileToolbar editor={editor} />}
      {slashMenu && (
        <SlashMenu
          items={slashMenu.items}
          command={(item) => item.command({ editor, range: slashMenu.range })}
          clientRect={slashMenu.clientRect}
          onClose={closeSlashMenu}
        />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { formatDate } from '@/lib/formatDate';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import DeleteDialog from '@/components/shared/DeleteDialog';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import MentionInput from '@/components/project/MentionInput';

// Highlights @mentions in comment content with a distinct color so they're
// visually distinguishable from plain text.
function renderContentWithMentions(content, mentionNames) {
  if (!content) return content;
  if (!mentionNames || mentionNames.length === 0) return content;
  const sortedNames = [...mentionNames].filter(Boolean).sort((a, b) => b.length - a.length);
  if (sortedNames.length === 0) return content;
  const escaped = sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`@(${escaped.join('|')})`, 'g');
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.substring(lastIndex, match.index));
    parts.push(
      <span key={`m-${key++}`} className="text-info font-semibold underline-offset-2 hover:underline cursor-pointer">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.substring(lastIndex));
  return parts.length > 0 ? parts : content;
}

export default function CommentItem({ comment: c, name, avatarUrl, canManage, onUpdate, onDelete, isSaving, mentionNames, projectId }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.content);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const save = () => {
    const v = draft.trim();
    if (v && v !== c.content) onUpdate(v);
    setEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
      setDraft(c.content);
    }
  };

  return (
    <div className="group/comment flex items-start gap-2.5 bg-muted/40 rounded-lg p-3 animate-slide-in">
      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-primary">{name?.[0] || '?'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{name}</p>
        {editing ? (
          <div className="mt-1 space-y-1.5" onKeyDown={handleEditKeyDown}>
            <MentionInput
              value={draft}
              onChange={setDraft}
              placeholder="ערוך תגובה..."
              className="flex w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none text-right"
              projectId={projectId}
            />
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={save} disabled={!draft.trim() || isSaving} className="h-7 rounded-full px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-none">
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'שמור'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(c.content); }} className="h-7 rounded-full px-3 text-xs">ביטול</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{renderContentWithMentions(c.content, mentionNames)}</p>
            {c.image_urls?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {c.image_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                    <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              {formatDate(c.created_date, 'time-day-short')}
              {c.edited_at && (
                <span className="text-[10px] text-muted-foreground" title={formatDate(c.edited_at, 'full-he-time')}>
                  · נערך
                </span>
              )}
            </p>
          </>
        )}
      </div>
      {canManage && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="self-start p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover/comment:opacity-100 focus:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" dir="rtl" className="w-32">
            <DropdownMenuItem onClick={() => { setDraft(c.content); setEditing(true); }} className="gap-2 text-xs">
              <Pencil className="w-3.5 h-3.5" /> עריכה
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteConfirm(true)} className="gap-2 text-xs text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5" /> מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DeleteDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        onConfirm={() => { setDeleteConfirm(false); onDelete(); }}
        title="מחיקת תגובה"
        description="האם למחוק את התגובה?"
      />
    </div>
  );
}
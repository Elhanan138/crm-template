import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';

/**
 * Standardized delete confirmation modal.
 * RTL layout: title + body right-aligned, red delete button pinned left (compact), X close button top-left.
 * No cancel button — close via X or backdrop.
 */
export default function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'מחיקה',
  itemName,
  description,
  confirmLabel = 'מחק',
  loading = false,
  extraActions,
  children,
}) {
  const body = description || (itemName ? `האם למחוק את '${itemName}'?` : 'האם אתה בטוח שברצונך למחוק?');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm p-0 overflow-hidden gap-0 block">
        {/* X close button — top left */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="סגור"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title — flush right */}
        <div className="px-5 pt-5 pb-1">
          <h2 className="text-base font-bold text-start text-foreground leading-tight">{title}</h2>
        </div>

        {/* Body — flush right */}
        <div className="px-5 pb-4 pt-1 text-start">
          {children || (
            <p className="text-sm text-muted-foreground [overflow-wrap:anywhere] break-words">
              {body}
            </p>
          )}
        </div>

        {/* Actions — pinned left (justify-end in RTL), compact button */}
        <div className="flex justify-end items-center gap-2 px-5 pb-4">
          {extraActions}
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="gap-1.5 h-8 px-4 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
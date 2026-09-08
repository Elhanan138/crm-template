import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Command, CommandList, CommandGroup, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlignRight, Heading1, Heading2, Heading3, List, ListOrdered,
  ListChecks, Quote, Code2, Minus,
} from 'lucide-react';

const ICON_MAP = {
  AlignRight, Heading1, Heading2, Heading3, List, ListOrdered,
  ListChecks, Quote, Code2, Minus,
};

export default function SlashMenu({ items, command, clientRect, onClose }) {
  const isMobile = useIsMobile();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedRef = useRef(0);

  useEffect(() => { setSelectedIndex(0); selectedRef.current = 0; }, [items]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        selectedRef.current = Math.max(0, selectedRef.current - 1);
        setSelectedIndex(selectedRef.current);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        selectedRef.current = Math.min(items.length - 1, selectedRef.current + 1);
        setSelectedIndex(selectedRef.current);
      } else if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        const item = items[selectedRef.current];
        if (item) command(item);
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [items, command, onClose]);

  if (items.length === 0) {
    if (isMobile) {
      return (
        <Sheet open onOpenChange={(v) => !v && onClose()}>
          <SheetContent side="bottom" dir="rtl" className="p-0">
            <div className="py-6 text-center text-sm text-muted-foreground">לא נמצאה פקודה</div>
          </SheetContent>
        </Sheet>
      );
    }
    const style = { position: 'fixed', top: (clientRect?.bottom || 0) + 4, left: clientRect?.left || 0 };
    return createPortal(
      <div style={style} className="w-64 bg-popover border border-border rounded-lg shadow-md p-2">
        <p className="py-2 text-center text-sm text-muted-foreground">לא נמצאה פקודה</p>
      </div>,
      document.body
    );
  }

  if (isMobile) {
    return (
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" dir="rtl" className="p-0">
          <Command className="bg-popover">
            <CommandList>
              <CommandGroup>
                {items.map((item, idx) => {
                  const Icon = ICON_MAP[item.icon] || AlignRight;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => { command(item); onClose(); }}
                      className="min-h-[44px] flex items-center gap-3 px-4 py-3"
                      data-selected={idx === selectedIndex}
                    >
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.label}</div>
                        <div className="text-caption">{item.description}</div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </SheetContent>
      </Sheet>
    );
  }

  const style = {
    position: 'fixed',
    top: (clientRect?.bottom || 0) + 4,
    left: clientRect?.left || 0,
    zIndex: 50,
  };

  return createPortal(
    <div style={style} className="w-64 bg-popover border border-border rounded-lg shadow-md p-1 max-h-80 overflow-y-auto">
      <Command className="bg-transparent">
        <CommandList>
          <CommandEmpty>לא נמצאה פקודה</CommandEmpty>
          <CommandGroup>
            {items.map((item, idx) => {
              const Icon = ICON_MAP[item.icon] || AlignRight;
              return (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => { command(item); onClose(); }}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-sm cursor-pointer ${idx === selectedIndex ? 'bg-accent text-accent-foreground' : ''}`}
                  data-selected={idx === selectedIndex}
                >
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-caption">{item.description}</div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>,
    document.body
  );
}
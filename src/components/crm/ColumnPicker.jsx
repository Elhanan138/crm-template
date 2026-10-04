import React from 'react';
import { Columns3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';

/**
 * Which columns this person wants to see.
 *
 * The schema's `list: true` is the default, not the ceiling: every declared
 * field can be shown, including the ones a module chose to keep out of the
 * table by default. The choice is per person and per module.
 */
export default function ColumnPicker({ schema, visibleKeys, onToggle, onReset }) {
  const { t, dir } = useI18n();
  const fields = (schema?.fields || []).filter((f) => f.type !== 'textarea');
  const chosen = new Set(visibleKeys);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full h-9 px-3.5 text-sm gap-1.5" title={t('עמודות')}>
          <Columns3 className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">{t('עמודות')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent dir={dir} align="end" className="max-h-80 overflow-y-auto w-56">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 text-xs">
          {t('עמודות')}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> {t('איפוס')}
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {fields.map((field) => (
          // A label rather than a menu item: a menu item closes the menu on
          // click, and choosing columns is something people do several at a time.
          <label
            key={field.key}
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-muted"
          >
            <Checkbox
              checked={chosen.has(field.key)}
              onCheckedChange={() => onToggle(field.key)}
              aria-label={field.label}
            />
            <span className="truncate">{field.label}</span>
          </label>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

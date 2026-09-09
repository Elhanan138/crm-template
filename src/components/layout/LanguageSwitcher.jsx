import React, { useState } from 'react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check } from 'lucide-react';
import { useI18n, LANGUAGES } from '@/lib/i18n';

/**
 * The language control, at the foot of the navigation.
 *
 * Deliberately the quietest thing on the screen: the two-letter code of the
 * language you are already in, and nothing else. It is set once and then never
 * touched again, so it earns a label and not a control — a segmented switch
 * spent a whole row of the sidebar restating a choice nobody was revisiting.
 *
 * The menu is the system's own dropdown, so it opens, aligns and animates like
 * every other menu here. Each option is written in ITS OWN language: someone
 * who cannot read the current one still has to find their way out.
 */
export default function LanguageSwitcher({ isCollapsed }) {
  const { lang, setLang, t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={`${t('שפה')}: ${current.label}`}
          aria-label={`${t('שפה')}: ${current.label}`}
          className={`flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isCollapsed ? 'justify-center w-full px-2' : ''
          } ${open ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {current.short}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent dir={dir} align="start" side="top" className="min-w-[9rem]">
        {LANGUAGES.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onSelect={() => setLang(option.code)}
            lang={option.code}
            dir={option.dir}
            className="justify-between gap-3 text-sm"
          >
            <span>{option.label}</span>
            {option.code === lang && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

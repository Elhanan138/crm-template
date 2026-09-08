import React from 'react';
import { Languages } from 'lucide-react';
import { useI18n, LANGUAGES } from '@/lib/i18n';

/**
 * The language control, at the foot of the navigation.
 *
 * Two languages are a segmented switch, not a dropdown: with a choice this
 * small a menu hides the option behind a click for no benefit, and the current
 * language should be readable at a glance rather than opened to check.
 *
 * Each option is labelled in ITS OWN language — someone who cannot read the
 * current one still has to be able to find their way out.
 */
export default function LanguageSwitcher({ isCollapsed }) {
  const { lang, setLang, t } = useI18n();

  if (isCollapsed) {
    const next = LANGUAGES[(LANGUAGES.findIndex((l) => l.code === lang) + 1) % LANGUAGES.length];
    return (
      <button
        type="button"
        onClick={() => setLang(next.code)}
        title={`${t('שפה')}: ${next.label}`}
        aria-label={`${t('שפה')}: ${next.label}`}
        className="flex items-center justify-center gap-3 rounded-xl px-2 py-2.5 w-full text-sm font-medium text-foreground/70 hover:bg-muted/70 hover:text-foreground transition-all duration-150"
      >
        <Languages className="w-[18px] h-[18px] flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
        <Languages className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-[11px] font-medium">{t('שפה')}</span>
      </div>
      <div className="flex bg-muted/60 rounded-full p-0.5" role="group" aria-label={t('שפה')}>
        {LANGUAGES.map((option) => {
          const active = option.code === lang;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLang(option.code)}
              aria-pressed={active}
              lang={option.code}
              dir={option.dir}
              className={`flex-1 rounded-full py-1 text-[11px] transition-colors ${
                active
                  ? 'bg-card text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

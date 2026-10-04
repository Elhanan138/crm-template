import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, X, ArrowLeft, Settings as SettingsIcon, Plus, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { useWhatsNew } from '@/lib/whatsNew';
import { useI18n } from '@/lib/i18n';

const DISMISS_KEY = 'getting_started_dismissed';

const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};

// The first record worth creating, in the order the revenue journey runs.
const FIRST_RECORD = ['leads', 'contacts', 'projects', 'invoices'].find((id) => ACTIVE_MODULE_IDS.includes(id));

/**
 * Five things worth knowing in the first five minutes, and what is new since
 * the last visit. Derived from this build: a step for a module that was not
 * exported is never shown, and the card goes away for good when dismissed.
 *
 * Deliberately not a guided overlay that walks the screen: those block the
 * page, break on mobile and are dismissed unread. A card with links can be
 * read at a glance and acted on in any order.
 */
export default function GettingStarted({ isAdmin }) {
  const { t, setLang, lang } = useI18n();
  const { unseen } = useWhatsNew();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed && unseen.length === 0) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
    setDismissed(true);
  };

  const steps = [
    {
      key: 'search', icon: Search,
      title: t('חיפוש מכל מקום'),
      body: t('Ctrl+K מוצא כל רשומה בכל מודול, ומציע מה ליצור.'),
      action: () => window.dispatchEvent(new CustomEvent('global-search-open')),
      actionLabel: t('פתח חיפוש'),
    },
    FIRST_RECORD && {
      key: 'first', icon: Plus,
      title: t('הרשומה הראשונה'),
      body: t('מכאן הכל מתחבר: לקוח אחד מוביל להצעות, לחשבוניות ולפרויקטים שלו.'),
      to: `${MODULES[FIRST_RECORD].navPath}${FIRST_RECORD === 'projects' ? '/new' : '?new=1'}`,
      actionLabel: `${t('חדש')} — ${t(CRM_SCHEMAS[FIRST_RECORD]?.singular || MODULES[FIRST_RECORD].label)}`,
    },
    isAdmin && ACTIVE_MODULE_IDS.includes('settings') && {
      key: 'capabilities', icon: SettingsIcon,
      title: t('מה פתוח ולמי'),
      body: t('הגדרות → יכולות המערכת: כל מודול ויכולת, פתוח לכולם, לאדמינים או סגור.'),
      to: `${MODULES.settings.navPath}?tab=admin`,
      actionLabel: t('מעבר להגדרות'),
    },
    {
      key: 'language', icon: Languages,
      title: t('עברית או English'),
      body: t('הממשק כולו מתהפך לפי השפה — כולל הכיוון.'),
      action: () => setLang(lang === 'he' ? 'en' : 'he'),
      actionLabel: lang === 'he' ? 'English' : 'עברית',
    },
  ].filter(Boolean);

  return (
    <section className="mb-6 bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <p className="inline-flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          {dismissed ? t('מה חדש') : t('צעדים ראשונים')}
        </p>
        {!dismissed && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismiss} aria-label={t('הסתר')} title={t('הסתר')}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!dismissed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {steps.map((step) => (
            <div key={step.key} className="bg-card p-4 flex flex-col gap-2">
              <step.icon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-xs text-muted-foreground flex-1">{step.body}</p>
              {step.to ? (
                <Link to={step.to} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  {step.actionLabel} <ArrowLeft className="w-3 h-3 rtl:rotate-0 ltr:rotate-180" />
                </Link>
              ) : (
                <button onClick={step.action} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline self-start">
                  {step.actionLabel} <ArrowLeft className="w-3 h-3 rtl:rotate-0 ltr:rotate-180" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* What arrived since this person last opened each module. Opening the
          module clears it — here and on the sidebar dot alike. */}
      {unseen.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {unseen.slice(0, 6).map((entry) => (
            <li key={entry.id}>
              <Link
                to={MODULES[entry.module].navPath}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-info flex-shrink-0" />
                <span className="text-sm font-medium">{t(entry.title)}</span>
                <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{t(entry.body)}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{t(MODULES[entry.module].label)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

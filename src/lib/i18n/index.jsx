import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { DICTIONARIES, LANGUAGES } from './dictionary';

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE
//
// The system is Hebrew-first and right-to-left. English is a translation layer
// over it, not a rewrite: `t(hebrew)` returns the Hebrew unchanged in Hebrew and
// looks the string up in the dictionary in English, falling back to the Hebrew
// when there is no entry.
//
// Direction is part of the language, not a separate setting. Switching to
// English flips `dir` on the document — which is what `postcss-rtlcss` and every
// logical utility in the stylesheet already key off — so the layout mirrors
// without a single component being asked about it.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'app_language';
const DEFAULT_LANG = 'he';

const LanguageContext = createContext(null);

const langMeta = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

const readStored = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStored);
  const dir = langMeta(lang).dir;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((code) => {
    if (!LANGUAGES.some((l) => l.code === code)) return;
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* private mode */ }
  }, []);

  const t = useCallback(
    (text) => {
      if (text === null || text === undefined) return text;
      const dictionary = DICTIONARIES[lang];
      if (!dictionary) return text;
      // An untranslated string shows in Hebrew. That is a blemish; an empty
      // label or a raw key would be a broken screen.
      return dictionary[text] ?? text;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, dir, t, isRtl: dir === 'rtl' }), [lang, setLang, dir, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Language, direction and the translator.
 *
 * Safe outside the provider: a component rendered in a test or in isolation
 * gets Hebrew and RTL rather than throwing.
 */
export function useI18n() {
  return (
    useContext(LanguageContext) || {
      lang: DEFAULT_LANG,
      setLang: () => {},
      dir: 'rtl',
      isRtl: true,
      t: (text) => text,
    }
  );
}

/** Just the translator, for components that need nothing else. */
export const useT = () => useI18n().t;

/**
 * A schema translated for display: title, subtitle, singular, field labels,
 * option labels and filter labels. The schema itself is never mutated — the
 * data keys and option VALUES stay exactly as stored.
 */
export function translateSchema(schema, t) {
  if (!schema || t === undefined) return schema;
  const field = (f) => ({
    ...f,
    label: t(f.label),
    help: f.help ? t(f.help) : f.help,
    options: f.options?.map((o) => ({ ...o, label: t(o.label) })),
  });
  return {
    ...schema,
    title: t(schema.title),
    subtitle: t(schema.subtitle),
    singular: t(schema.singular),
    fields: (schema.fields || []).map(field),
    filters: (schema.filters || []).map((f) => ({
      ...f,
      label: t(f.label),
      options: f.options?.map((o) => ({ ...o, label: t(o.label) })),
    })),
    boardStages: schema.boardStages?.map((s) => ({ ...s, label: t(s.label) })),
  };
}

export { LANGUAGES };

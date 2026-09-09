import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { LanguageProvider, LANGUAGES, useI18n } from '@/lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

// The menu itself is the system's Radix dropdown; opening one under jsdom never
// settles, so what is asserted here is everything around it — what the trigger
// shows, what it announces, and what actually happens when the language
// changes. The menu opening is verified in the browser.
const show = (props = {}) =>
  render(<LanguageProvider><LanguageSwitcher {...props} /></LanguageProvider>);

const trigger = () => screen.getByRole('button', { name: /שפה|Language/ });

// A handle on the same context the menu items call.
let switcher = null;
function Probe() {
  switcher = useI18n();
  return null;
}
const showWithProbe = (props = {}) => render(
  <LanguageProvider><LanguageSwitcher {...props} /><Probe /></LanguageProvider>,
);
const setLang = (code) => act(() => { switcher.setLang(code); });

beforeEach(() => { localStorage.clear(); switcher = null; });
afterEach(cleanup);

describe('the language control', () => {
  it('shows only the code of the language you are in', () => {
    show();
    expect(trigger()).toHaveTextContent('עב');
    // Nothing else on display: no label, no caption, no second option.
    expect(screen.queryByText('English')).toBeNull();
    expect(screen.queryByText('עברית')).toBeNull();
  });

  it('names the current language for anyone who cannot see the code', () => {
    show();
    expect(trigger()).toHaveAccessibleName('שפה: עברית');
  });

  it('is the same control on the collapsed rail — only centred', () => {
    show({ isCollapsed: true });
    expect(trigger()).toHaveTextContent('עב');
    expect(trigger().className).toContain('justify-center');
  });

  it('follows the language, and turns the page with it', () => {
    showWithProbe();
    setLang('en');
    expect(trigger()).toHaveTextContent('En');
    expect(trigger()).toHaveAccessibleName('Language: English');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    setLang('he');
    expect(trigger()).toHaveTextContent('עב');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('remembers the choice, so it is made once', () => {
    showWithProbe();
    setLang('en');
    cleanup();

    show();
    expect(trigger()).toHaveTextContent('En');
  });
});

describe('the languages on offer', () => {
  it('gives each one a code, a name in its own script, and a direction', () => {
    for (const option of LANGUAGES) {
      expect(option.code).toMatch(/^[a-z]{2}$/);
      expect(option.label.trim().length).toBeGreaterThan(0);
      expect(option.short.trim().length).toBeGreaterThan(0);
      expect(['rtl', 'ltr']).toContain(option.dir);
    }
  });

  it('keeps the codes distinct, so a choice is unambiguous', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

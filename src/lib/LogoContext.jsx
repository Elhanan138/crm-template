import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { APP_IDENTITY } from '@/lib/appIdentity';

// Defaults come from the build's identity file, so a blank-template export has
// no logo, no product name and no company details anywhere in the UI.
const DEFAULT_LOGO_URL = APP_IDENTITY.logo || '';
const LOGO_STORAGE_KEY = 'oss_custom_logo';
const SYSTEM_NAME_KEY = 'oss_system_name';
const SYSTEM_SUBTITLE_KEY = 'oss_system_subtitle';
const BRAND_COLOR_KEY = 'oss_brand_primary';
const RADIUS_KEY = 'oss_brand_radius';
const PALETTE_KEY = 'oss_brand_colors';

const DEFAULT_SYSTEM_NAME = APP_IDENTITY.name || '';
const DEFAULT_SYSTEM_SUBTITLE = APP_IDENTITY.subtitle || '';
const DEFAULT_COMPANY = APP_IDENTITY.company || {};
const COMPANY_KEY = 'oss_brand_company';
const DEFAULT_RADIUS = 0.75;

const read = (key, fallback = null) => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try {
    if (value === null || value === undefined || value === '') localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* quota or private mode — branding is non-critical */ }
};

/** Convert hex (#rrggbb) to HSL string "H S% L%" for CSS variables. */
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = 0; s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Relative luminance per WCAG 2.1. */
export function luminance(hex) {
  const channel = (v) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(hex.slice(1, 3));
  const g = channel(hex.slice(3, 5));
  const b = channel(hex.slice(5, 7));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between a brand color and the text placed on it. */
export function contrastRatio(hexA, hexB) {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black — whichever reads better on the given colour. */
export function bestForeground(hex) {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#111827') ? '#ffffff' : '#111827';
}

export const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v || '');

const BRAND_VARS = [
  '--primary', '--primary-foreground', '--brand', '--ring',
  '--sidebar-primary', '--sidebar-primary-foreground', '--sidebar-ring',
];

function applyBrandColor(hex) {
  if (!isHex(hex)) return;
  const hsl = hexToHsl(hex);
  const fg = hexToHsl(bestForeground(hex));
  const root = document.documentElement;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--primary-foreground', fg);
  root.style.setProperty('--brand', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-primary-foreground', fg);
  root.style.setProperty('--sidebar-ring', hsl);
}

function clearBrandColor() {
  const root = document.documentElement;
  BRAND_VARS.forEach((v) => root.style.removeProperty(v));
}

const LogoContext = createContext();

export const LogoProvider = ({ children }) => {
  const [customLogo, setCustomLogo] = useState(() => read(LOGO_STORAGE_KEY));
  const [systemName, setSystemNameState] = useState(() => read(SYSTEM_NAME_KEY, DEFAULT_SYSTEM_NAME) || DEFAULT_SYSTEM_NAME);
  const [systemSubtitle, setSystemSubtitleState] = useState(() => read(SYSTEM_SUBTITLE_KEY, DEFAULT_SYSTEM_SUBTITLE) || DEFAULT_SYSTEM_SUBTITLE);
  const [brandColor, setBrandColorState] = useState(() => read(BRAND_COLOR_KEY));
  const [radius, setRadiusState] = useState(() => {
    const stored = parseFloat(read(RADIUS_KEY, ''));
    return Number.isFinite(stored) ? stored : DEFAULT_RADIUS;
  });
  const [palette, setPaletteState] = useState(() => {
    try { return JSON.parse(read(PALETTE_KEY, '[]')) || []; } catch { return []; }
  });
  const [company, setCompanyState] = useState(() => {
    try { return { ...DEFAULT_COMPANY, ...(JSON.parse(read(COMPANY_KEY, '{}')) || {}) }; } catch { return { ...DEFAULT_COMPANY }; }
  });

  const logoUrl = customLogo || DEFAULT_LOGO_URL;

  useEffect(() => {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = logoUrl;
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((el) => { el.href = logoUrl; });
  }, [logoUrl]);

  useEffect(() => {
    const title = [systemName, systemSubtitle].filter(Boolean).join(' — ');
    if (title) document.title = title;
  }, [systemName, systemSubtitle]);

  useEffect(() => {
    if (brandColor) applyBrandColor(brandColor); else clearBrandColor();
  }, [brandColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--radius', `${radius}rem`);
  }, [radius]);

  const setLogo = useCallback((dataUrl) => { write(LOGO_STORAGE_KEY, dataUrl); setCustomLogo(dataUrl); }, []);
  const resetLogo = useCallback(() => { write(LOGO_STORAGE_KEY, null); setCustomLogo(null); }, []);

  const setCompany = useCallback((patch) => {
    setCompanyState((prev) => {
      const next = { ...prev, ...patch };
      write(COMPANY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setSystemName = useCallback((name) => {
    const trimmed = (name || '').trim() || DEFAULT_SYSTEM_NAME;
    write(SYSTEM_NAME_KEY, trimmed);
    setSystemNameState(trimmed);
  }, []);

  const setSystemSubtitle = useCallback((text) => {
    const trimmed = (text || '').trim();
    write(SYSTEM_SUBTITLE_KEY, trimmed || null);
    setSystemSubtitleState(trimmed);
  }, []);

  const setBrandColor = useCallback((hex) => {
    const value = isHex(hex) ? hex.toLowerCase() : null;
    write(BRAND_COLOR_KEY, value);
    setBrandColorState(value);
  }, []);

  const setRadius = useCallback((value) => {
    const num = Math.min(2, Math.max(0, Number(value) || 0));
    write(RADIUS_KEY, String(num));
    setRadiusState(num);
  }, []);

  const setPalette = useCallback((colors) => {
    const list = (colors || []).filter(isHex).slice(0, 8);
    write(PALETTE_KEY, JSON.stringify(list));
    setPaletteState(list);
  }, []);

  const exportBranding = useCallback(() => ({
    version: 1,
    systemName,
    systemSubtitle,
    brandColor,
    radius,
    palette,
    company,
    logo: customLogo,
  }), [systemName, systemSubtitle, brandColor, radius, palette, company, customLogo]);

  const importBranding = useCallback((config) => {
    if (!config || typeof config !== 'object') throw new Error('קובץ מיתוג לא תקין');
    if (config.systemName) setSystemName(config.systemName);
    if (config.systemSubtitle !== undefined) setSystemSubtitle(config.systemSubtitle);
    if (config.brandColor !== undefined) setBrandColor(config.brandColor);
    if (config.radius !== undefined) setRadius(config.radius);
    if (Array.isArray(config.palette)) setPalette(config.palette);
    if (config.company && typeof config.company === 'object') setCompany(config.company);
    if (config.logo) setLogo(config.logo); else if (config.logo === null) resetLogo();
  }, [setSystemName, setSystemSubtitle, setBrandColor, setRadius, setPalette, setCompany, setLogo, resetLogo]);

  const resetBranding = useCallback(() => {
    resetLogo();
    setSystemName(DEFAULT_SYSTEM_NAME);
    setSystemSubtitle(DEFAULT_SYSTEM_SUBTITLE);
    setBrandColor(null);
    setRadius(DEFAULT_RADIUS);
    setPalette([]);
    write(COMPANY_KEY, null);
    setCompanyState({ ...DEFAULT_COMPANY });
  }, [resetLogo, setSystemName, setSystemSubtitle, setBrandColor, setRadius, setPalette]);

  const value = useMemo(() => ({
    logoUrl, setLogo, resetLogo, isCustom: !!customLogo,
    systemName, setSystemName,
    systemSubtitle, setSystemSubtitle,
    brandColor, setBrandColor,
    radius, setRadius,
    palette, setPalette,
    company, setCompany,
    exportBranding, importBranding, resetBranding,
    defaults: {
      logoUrl: DEFAULT_LOGO_URL,
      systemName: DEFAULT_SYSTEM_NAME,
      systemSubtitle: DEFAULT_SYSTEM_SUBTITLE,
      radius: DEFAULT_RADIUS,
    },
  }), [logoUrl, setLogo, resetLogo, customLogo, systemName, setSystemName, systemSubtitle,
    setSystemSubtitle, brandColor, setBrandColor, radius, setRadius, palette, setPalette,
    company, setCompany, exportBranding, importBranding, resetBranding]);

  return <LogoContext.Provider value={value}>{children}</LogoContext.Provider>;
};

const NOOP_CONTEXT = {
  logoUrl: DEFAULT_LOGO_URL, setLogo: () => {}, resetLogo: () => {}, isCustom: false,
  systemName: DEFAULT_SYSTEM_NAME, setSystemName: () => {},
  systemSubtitle: DEFAULT_SYSTEM_SUBTITLE, setSystemSubtitle: () => {},
  brandColor: null, setBrandColor: () => {},
  radius: DEFAULT_RADIUS, setRadius: () => {},
  palette: [], setPalette: () => {},
  company: { ...DEFAULT_COMPANY }, setCompany: () => {},
  exportBranding: () => ({}), importBranding: () => {}, resetBranding: () => {},
  defaults: { logoUrl: DEFAULT_LOGO_URL, systemName: DEFAULT_SYSTEM_NAME, systemSubtitle: DEFAULT_SYSTEM_SUBTITLE, radius: DEFAULT_RADIUS },
};

export const useLogo = () => useContext(LogoContext) || NOOP_CONTEXT;

import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

// A raw Tailwind palette family. `neutral` is listed even though a
// `neutral-muted` TOKEN exists, because the ban matches a numeric suffix only —
// `bg-neutral-muted` carries no digits and is therefore never flagged.
const PALETTE =
  "slate|gray|zinc|neutral|stone|emerald|green|amber|yellow|red|rose|blue|sky|indigo|violet|purple|teal|cyan|orange|pink|lime|fuchsia";
const UTILITIES =
  "bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|outline|decoration";

const PALETTE_RE = `\\b(${UTILITIES})-(${PALETTE})-\\d{2,3}\\b`;

// Alpha over the brand slate. There is no `primary-muted` token — `accent` is
// it — and an ad-hoc alpha computes against whatever sits underneath, so the
// same class is a different colour on a card than on the page.
//
// Exactly three forms survive, each with a job no token covers:
//   bg-primary/90      a filled button's hover
//   border-primary/30  a brand-tinted edge
//   ring-primary/30    the same edge as a ring
// Everything else is banned, `brand` (the same slate under a second name)
// included. Seven files had each picked their own alpha for "an edge".
const BRAND_ALPHA_RE =
  "\\b(?:bg-primary\\/(?!90\\b)\\d+" +
  "|(?:border|ring)-primary\\/(?!30\\b)\\d+" +
  "|(?:text|from|to|via|fill|stroke|divide|outline|decoration)-primary\\/\\d+" +
  `|(?:${UTILITIES})-brand\\/\\d+)\\b`;

const TOKEN_MESSAGE =
  "צבע פלטה גולמי אסור — השתמש בטוקן סמנטי (success/warning/info/destructive/muted/accent/primary). ראה DESIGN_SYSTEM.md סעיף 1";
const ACCENT_MESSAGE =
  "אלפא על צבע המותג: מותר רק bg-primary/90, border-primary/30, ring-primary/30. למשטח מותג בהיר יש bg-accent, ולטבעת מיקוד ring-ring. ראה DESIGN_SYSTEM.md סעיף 1.1";

// Written once, matched in both places a class string can live: a plain string
// and a template literal. Missing the second is how `${active ? 'bg-blue-100'}`
// used to slip through.
const paletteBan = [
  { selector: `Literal[value=/${PALETTE_RE}/]`, message: TOKEN_MESSAGE },
  { selector: `TemplateElement[value.raw=/${PALETTE_RE}/]`, message: TOKEN_MESSAGE },
  { selector: `Literal[value=/${BRAND_ALPHA_RE}/]`, message: ACCENT_MESSAGE },
  { selector: `TemplateElement[value.raw=/${BRAND_ALPHA_RE}/]`, message: ACCENT_MESSAGE },
];

export default [
  {
    files: [
      "src/**/*.test.{js,jsx}",
      "src/test/**/*.{js,jsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        // Tests run in jsdom: they touch localStorage, Range, Element and the rest.
        ...globals.browser,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // A missing import is a blank screen at runtime and nothing at all at
      // build time — Vite happily bundles a name that is never defined. This is
      // the only check that catches it before someone opens the page.
      "no-undef": "error",
    },
  },
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      // A missing import is a blank screen at runtime and nothing at build time —
      // Vite bundles a name that is never defined without a word. This is the
      // only check that catches it before someone opens the page.
      "no-undef": "error",
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  // DESIGN SYSTEM — the colour ban, enforced.
  //
  // This block covers ALL of src, not just components and pages, and reports
  // at "error". Both were wrong before and the rule did nothing: a class string
  // in src/lib (a tone map, a status map) was outside the files it looked at,
  // and `npm run lint` runs `eslint . --quiet`, which prints errors only — so a
  // palette colour at "warn" passed lint, passed the build, and only showed up
  // as a colour that vanishes in one theme.
  //
  // A class string is a class string wherever it is written, so nothing here is
  // scoped to a className attribute either.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-restricted-syntax": ["error", ...paletteBan],
    },
  },
  {
    // The test that proves the ban works has to contain the strings it rejects.
    // It is the only file allowed to, and it asserts on the rule's own output,
    // so switching the rule off here cannot weaken it.
    files: ["src/test/designSystem.test.js"],
    rules: { "no-restricted-syntax": "off" },
  },
];
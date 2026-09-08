import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/**/*.test.{js,jsx}",
      "src/test/**/*.{js,jsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
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
      // Prevent re-introducing hardcoded Tailwind palette colors instead of semantic tokens.
      // Allowed: chart-* tokens and the semantic tokens (primary/success/warning/info/destructive/muted/accent).
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/\\b(bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|outline|decoration)-(slate|gray|zinc|neutral|stone|emerald|green|amber|yellow|red|rose|blue|sky|indigo|violet|purple|teal|cyan|orange|pink|lime|fuchsia)-\\d{2,3}\\b/]",
          message:
            "השתמש בטוקן סמנטי (success/warning/info/destructive/muted/primary) במקום צבע Tailwind קשיח. ראה /admin/style-guide.",
        },
        {
          selector:
            "TemplateElement[value.raw=/\\b(bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|outline|decoration)-(slate|gray|zinc|neutral|stone|emerald|green|amber|yellow|red|rose|blue|sky|indigo|violet|purple|teal|cyan|orange|pink|lime|fuchsia)-\\d{2,3}\\b/]",
          message:
            "השתמש בטוקן סמנטי (success/warning/info/destructive/muted/primary) במקום צבע Tailwind קשיח. ראה /admin/style-guide.",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\b(bg|text|border|ring)-primary\\/(5|10|15|20)\\b/]",
          message:
            "אין טוקן primary-muted — השתמש ב-bg-accent / text-accent-foreground. ראה DESIGN_SYSTEM.md סעיף 1.1",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\b(bg|text|border)-(red|blue|green|yellow|gray|slate|orange|purple|amber|emerald|zinc|neutral|stone)-[0-9]{2,3}\\b/]",
          message:
            "צבע פלטה גולמי אסור — השתמש בטוקן סמנטי. ראה DESIGN_SYSTEM.md סעיף 1",
        },
      ],
    },
  },
];
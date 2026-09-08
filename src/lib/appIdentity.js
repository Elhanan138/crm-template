// Product identity baked into the build. The ZIP export rewrites ONLY this file
// (pure data), which is how a branded export ships with its own name and a
// template export ships with none.
//
// EVERY FIELD IS EMPTY ON PURPOSE. A template must not arrive carrying someone
// else's product name, tagline or logo: whoever deploys it sets these in
// הגדרות → מיתוג, or through VITE_APP_NAME at build time. Do not put a default
// back here.
export const APP_IDENTITY = {
  name: '',
  subtitle: '',
  logo: '',
  company: {
    tagline: '',
    legalId: '',
    address: '',
    paymentTerms: '',
    bank: '',
  },
};

// Shown only where a layout would otherwise collapse to nothing. Generic by
// design — it names the category, never a product.
export const FALLBACK_APP_NAME = 'מערכת ניהול';

export const isBlankTemplate = () => !APP_IDENTITY.name;

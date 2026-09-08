// Product identity baked into the build. The ZIP export rewrites ONLY this file
// (pure data), which is how a "blank template" export ships with no branding and
// no trace of the original product name.
export const APP_IDENTITY = {
  name: 'OSS',
  subtitle: 'CRM & Delivery Operations',
  logo: '/icon-192.png',
  company: {
    tagline: 'AI Solutions',
    legalId: '',
    address: '',
    paymentTerms: '',
    bank: '',
  },
};

export const isBlankTemplate = () => !APP_IDENTITY.name;

import React from 'react';
import { useLogo } from '@/lib/LogoContext';

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT LETTERHEAD
//
// Everything the system generates and sends outwards — a quote, a signed form,
// a project report — is the customer's document, not ours. Branding was set
// once in הגדרות → מיתוג, and each document was reproducing it by hand: the
// proposal printed the company details and no logo, the form PDF printed
// neither, and the project export printed a title.
//
// One letterhead, read from the branding context, means setting a logo once
// puts it on every document, and a new document type inherits the branding by
// rendering this instead of by remembering to.
//
// The `doc-*` tokens are fixed light values on purpose: a document is printed
// against white whatever theme the sender is using.
// ─────────────────────────────────────────────────────────────────────────────

/** The parts of the branding a document shows, with the empties removed. */
export function useDocumentBranding() {
  const { systemName, logoUrl, company, brandColor } = useLogo();
  return {
    name: systemName || '',
    logo: logoUrl || '',
    // For the one document that is drawn with inline styles rather than
    // classes. Everything else takes the brand through the `doc-accent` token.
    color: brandColor || '#2d3436',
    tagline: company?.tagline || '',
    details: [
      company?.legalId && `ח.פ: ${company.legalId}`,
      company?.address,
    ].filter(Boolean).join(' | '),
    terms: [
      company?.paymentTerms && `תנאי תשלום: ${company.paymentTerms}`,
      company?.bank && `בנק: ${company.bank}`,
    ].filter(Boolean).join(' | '),
  };
}

/**
 * The head of a printed document: the sender on one side, what the document
 * is on the other.
 *
 * @param {string} title  what this document is — "הצעת מחיר", "דוח פרויקט"
 * @param {React.ReactNode} meta  its number, dates, anything document-specific
 */
export default function DocumentLetterhead({ title, meta = null, className = '' }) {
  const brand = useDocumentBranding();

  return (
    <div className={`flex justify-between items-start gap-6 border-b-2 border-doc-accent pb-4 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {brand.logo && (
          <img
            src={brand.logo}
            alt=""
            className="w-14 h-14 object-contain flex-shrink-0"
            // html2canvas rasterises what it is given; a logo that has not
            // finished decoding comes out blank rather than late.
            crossOrigin="anonymous"
          />
        )}
        <div className="min-w-0">
          {brand.name && <h1 className="text-3xl font-bold text-doc-accent break-words">{brand.name}</h1>}
          {brand.tagline && <p className="text-sm text-doc-muted mt-1">{brand.tagline}</p>}
          {brand.details && <p className="text-xs text-doc-muted mt-2">{brand.details}</p>}
          {brand.terms && <p className="text-xs text-doc-muted">{brand.terms}</p>}
        </div>
      </div>
      {(title || meta) && (
        <div className="text-start flex-shrink-0">
          {title && <h2 className="text-xl font-bold text-doc-foreground">{title}</h2>}
          {meta}
        </div>
      )}
    </div>
  );
}

/** The foot of a printed document. Kept beside the head so they stay in step. */
export function DocumentFooter({ children, className = '' }) {
  const brand = useDocumentBranding();
  const line = [brand.name, brand.details].filter(Boolean).join(' · ');
  if (!line && !children) return null;
  return (
    <div className={`border-t border-doc-rule pt-3 mt-8 text-[10px] text-doc-muted ${className}`}>
      {children}
      {line && <p>{line}</p>}
    </div>
  );
}

/** The white sheet a document is rendered onto, ready for html2canvas. */
export function DocumentSheet({ innerRef, className = '', children }) {
  return (
    <div
      ref={innerRef}
      className={`bg-doc text-doc-foreground w-[800px] max-w-full mx-auto px-8 py-10 ${className}`}
    >
      {children}
    </div>
  );
}

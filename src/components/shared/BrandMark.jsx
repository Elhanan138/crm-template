import React from 'react';
import { useLogo } from '@/lib/LogoContext';
import { FALLBACK_APP_NAME } from '@/lib/appIdentity';

/**
 * The product mark. Falls back to a monogram when no logo is configured, so a
 * blank-template deployment never shows a broken image or a borrowed asset.
 */
export default function BrandMark({ className = '', size, alt }) {
  const { logoUrl, systemName } = useLogo();
  const style = size ? { width: size, height: size } : undefined;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={alt ?? systemName ?? ''}
        style={style}
        className={`object-contain ${className}`}
      />
    );
  }

  const initial = (systemName || FALLBACK_APP_NAME).trim().charAt(0).toUpperCase();
  return (
    <span
      style={style}
      aria-label={alt ?? systemName ?? ''}
      className={`flex items-center justify-center bg-primary text-primary-foreground font-bold select-none ${className}`}
    >
      {initial || <span className="w-1/3 h-1/3 rounded-sm bg-primary-foreground/70" />}
    </span>
  );
}

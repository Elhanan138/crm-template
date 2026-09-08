import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Unified form field: label + control (children) + optional help text + error message.
// Consistent spacing and error styling via the destructive token.
export default function Field({ label, htmlFor, required, error, help, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive me-1">*</span>}
        </Label>
      )}
      {required && React.isValidElement(children)
        ? React.cloneElement(children, {
            required: true,
            onInvalid: (e) => { e.target.setCustomValidity('שדה חובה'); children.props.onInvalid?.(e); },
            onInput: (e) => { e.target.setCustomValidity(''); children.props.onInput?.(e); },
          })
        : children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : help ? (
        <p className="text-caption">{help}</p>
      ) : null}
    </div>
  );
}
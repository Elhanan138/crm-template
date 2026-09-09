import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Unified form field: label + control (children) + optional help text + error message.
// Consistent spacing and error styling via the destructive token.

// A required field asks the browser to validate it, which only means anything
// for a real form control. A read-only summary is sometimes shown in a field's
// place — putting `required` on that plain <div> is a React warning and nothing
// else, so the wrapper checks before it clones.
const VALIDATABLE = new Set(['input', 'textarea', 'select']);
const acceptsValidation = (child) =>
  typeof child.type !== 'string' || VALIDATABLE.has(child.type);
export default function Field({ label, htmlFor, required, error, help, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive me-1">*</span>}
        </Label>
      )}
      {required && React.isValidElement(children) && acceptsValidation(children)
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
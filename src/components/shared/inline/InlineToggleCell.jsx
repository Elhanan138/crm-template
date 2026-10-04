import React from 'react';
import { Switch } from '@/components/ui/switch';

/**
 * Inline boolean toggle via Switch.
 * stopPropagation so row-level onClick doesn't fire.
 */
export default function InlineToggleCell({ value, onChange, canEdit = true, disabled = false }) {
  return (
    <Switch
      checked={!!value}
      onCheckedChange={v => onChange(v)}
      disabled={!canEdit || disabled}
      onClick={e => e.stopPropagation()}
    />
  );
}
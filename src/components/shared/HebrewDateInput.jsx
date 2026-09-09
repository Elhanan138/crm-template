import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Unified Hebrew date input in dd/MM/yyyy format.
 * Stores ISO date (yyyy-mm-dd) internally, displays dd/MM/yyyy to the user.
 */
export default function HebrewDateInput({ value, onChange, className, ...props }) {
  const [display, setDisplay] = useState('');

  // Convert ISO (yyyy-mm-dd) → display (dd/MM/yyyy)
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setDisplay(`${d}/${m}/${y}`);
    } else {
      setDisplay(value || '');
    }
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^\d/]/g, '');
    // Auto-insert slashes
    if (raw.length === 2 && !raw.includes('/') && display.length < 2) raw += '/';
    if (raw.length === 5 && raw.split('/').length === 2 && display.length < 5) raw += '/';

    setDisplay(raw);

    // Parse dd/MM/yyyy → yyyy-mm-dd
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const iso = `${y}-${m}-${d}`;
      // Validate it's a real date
      const dt = new Date(`${iso}T00:00:00`);
      if (!isNaN(dt)) {
        onChange(iso);
        return;
      }
    }
    // If not a complete valid date, still call onChange with raw so parent can track
    if (raw === '') onChange('');
  };

  return (
    <Input
      type="text"
      value={display}
      onChange={handleChange}
      placeholder="dd/MM/yyyy"
      maxLength={10}
      className={className}
      dir="ltr"
      {...props}
    />
  );
}

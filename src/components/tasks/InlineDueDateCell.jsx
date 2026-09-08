import React from 'react';
import DateField from '@/components/ui/date-field';

export default function InlineDueDateCell({ value, onChange, isOverdue = false }) {
  return (
    <div onClick={e => e.stopPropagation()} className="inline-block">
      <DateField
        value={value}
        onChange={onChange}
        placeholder="ללא תאריך"
        clearable
        className={`h-7 px-2 text-xs w-auto ${isOverdue ? 'text-destructive font-semibold' : ''}`}
      />
    </div>
  );
}
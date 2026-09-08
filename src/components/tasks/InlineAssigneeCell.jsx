import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';

export default function InlineAssigneeCell({ value, onChange, teamMembers = [] }) {
  const display = value || '__none__';
  return (
    <div onClick={e => e.stopPropagation()} className="min-w-0">
      <Select value={display} onValueChange={v => onChange(v === '__none__' ? '' : v)}>
        <SelectTrigger className="h-7 w-full border-0 bg-transparent shadow-none hover:bg-muted/50 active:bg-muted px-1.5 py-0 text-xs gap-1 focus:ring-0 transition-colors">
          <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <SelectValue placeholder="לא שויך" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value="__none__">— ללא אחראי —</SelectItem>
          {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
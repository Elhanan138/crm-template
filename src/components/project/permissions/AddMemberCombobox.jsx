import React, { useState, useMemo } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from '@/components/ui/command';
import { UserPlus, Users } from 'lucide-react';

export default function AddMemberCombobox({ members, excludedEmails, onAdd, onAddGroup, groups }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const available = useMemo(() => {
    const excluded = new Set((excludedEmails || []).map(e => (e || '').toLowerCase().trim()));
    return members.filter(m => !excluded.has((m.email || '').toLowerCase().trim()));
  }, [members, excludedEmails]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.trim().toLowerCase();
    return available.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  }, [available, search]);

  const filteredGroups = useMemo(() => {
    const gs = (groups || []).filter(g => (g.member_emails || []).length > 0);
    if (!search.trim()) return gs;
    const q = search.trim().toLowerCase();
    return gs.filter(g => (g.name || '').toLowerCase().includes(q));
  }, [groups, search]);

  const hasResults = filteredMembers.length > 0 || filteredGroups.length > 0;

  const handleSelect = (member) => {
    onAdd(member);
    setSearch('');
    setOpen(false);
  };

  const handleSelectGroup = (group) => {
    onAddGroup(group);
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-card text-sm text-muted-foreground hover:border-primary/40 transition-colors text-start"
        >
          <UserPlus className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="flex-1 truncate">הוסף חבר צוות...</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[280px]" align="start" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="חיפוש חבר צוות או קבוצה..."
            className="h-9"
          />
          <CommandList>
            {hasResults ? (
              <>
                {filteredMembers.length > 0 && (
                  <CommandGroup heading="חברי צוות">
                    {filteredMembers.map(m => (
                      <CommandItem
                        key={m.id}
                        value={m.name + ' ' + m.email}
                        onSelect={() => handleSelect(m)}
                        className="flex items-center gap-2"
                      >
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">{m.name?.[0] || '?'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {filteredGroups.length > 0 && (
                  <CommandGroup heading="קבוצות">
                    {filteredGroups.map(g => (
                      <CommandItem
                        key={g.id}
                        value={g.name}
                        onSelect={() => handleSelectGroup(g)}
                        className="flex items-center gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{(g.member_emails || []).length} חברים</p>
                        </div>
                        <span className="text-[10px] font-medium text-accent-foreground bg-accent px-1.5 py-0.5 rounded-full flex-shrink-0">קבוצה</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search.trim() ? 'לא נמצאו תוצאות' : 'אין חברי צוות זמינים'}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
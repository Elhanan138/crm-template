import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SectionStepperNav({
 title,
 sections,
 activeKey,
 activeChildKey,
 onSelect,
 onSelectChild,
 searchable = false,
 searchPlaceholder = 'חיפוש...',
}) {
 const [query, setQuery] = useState('');

 const filtered = useMemo(() => {
  if (!query.trim()) return sections;
  const q = query.trim().toLowerCase();
  return sections.filter(s => s.label.toLowerCase().includes(q));
 }, [sections, query]);

 const activeSection = sections.find(s => s.key === activeKey);
 const hasChildren = !!activeSection?.children?.length && activeChildKey !== undefined && !!onSelectChild;

 return (
  <div dir="rtl"className="space-y-3">
   {/* Mobile: Select dropdowns */}
   <div className="lg:hidden space-y-2">
    <Select value={activeKey} onValueChange={onSelect}>
     <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
     <SelectContent dir="rtl">
      {sections.map(s => (
       <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
      ))}
     </SelectContent>
    </Select>
    {hasChildren && (
     <Select value={activeChildKey} onValueChange={onSelectChild}>
      <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
      <SelectContent dir="rtl">
       {activeSection.children.map(c => (
        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
       ))}
      </SelectContent>
     </Select>
    )}
   </div>

   {/* Desktop: vertical nav */}
   <div className="hidden lg:block">
    {title && <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>}
    {searchable && (
     <div className="relative mb-3">
      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"/>
      <input
       type="text"
       value={query}
       onChange={(e) => setQuery(e.target.value)}
       placeholder={searchPlaceholder}
       className="w-full h-8 rounded-lg bg-muted/40 border border-transparent px-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-input focus:bg-background transition-colors"
       dir="rtl"
      />
     </div>
    )}
    <div className="space-y-0.5">
     {filtered.map(section => {
      const isActive = activeKey === section.key;
      const Icon = section.icon;
      const showChildren = isActive && hasChildren;
      return (
       <div key={section.key}>
        <button
         onClick={() => onSelect(section.key)}
         className={`relative w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          isActive
           ? 'bg-accent text-accent-foreground font-semibold'
           : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
         }`}
        >
         <Icon className="w-4 h-4 flex-shrink-0"/>
         <span>{section.label}</span>
         {section.badge ? (
          <span className="ms-auto rounded-full bg-warning-muted text-warning text-[10px] px-1.5 py-0.5 font-semibold">
           {section.badge}
          </span>
         ) : null}
         {isActive && (
          <span className="absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"/>
         )}
        </button>
        {showChildren && section.children && (
         <div className="me-6 space-y-0.5 mt-0.5">
          {section.children.map(child => {
           const childActive = activeChildKey === child.key;
           const ChildIcon = child.icon;
           return (
            <button
             key={child.key}
             onClick={() => onSelectChild(child.key)}
             className={`relative w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              childActive
               ? 'bg-accent text-accent-foreground font-semibold'
               : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
             }`}
            >
             <ChildIcon className="w-3.5 h-3.5 flex-shrink-0"/>
             <span>{child.label}</span>
             {childActive && (
              <span className="absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"/>
             )}
            </button>
           );
          })}
         </div>
        )}
       </div>
      );
     })}
    </div>
   </div>
  </div>
 );
}
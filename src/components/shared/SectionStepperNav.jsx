import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';

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
 const { t } = useI18n();
 const [query, setQuery] = useState('');

 // Searching only the top-level labels made the box useless here: the settings
 // page has two top-level tabs and ten sub-sections, so typing "מיתוג" — the
 // name of an actual section — matched nothing. A search over a tree has to
 // look inside the tree, and show the branch that holds the hit.
 const q = query.trim().toLowerCase();
 const matches = (item) =>
  !q || [item.label, item.hint].filter(Boolean).some(t => String(t).toLowerCase().includes(q));

 const filtered = useMemo(() => {
  if (!q) return sections;
  return sections
   .map(section => {
    if (matches(section)) return section;
    const children = (section.children || []).filter(matches);
    return children.length ? { ...section, children } : null;
   })
   .filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [sections, q]);

 const activeSection = sections.find(s => s.key === activeKey);
 const hasChildren = !!activeSection?.children?.length && activeChildKey !== undefined && !!onSelectChild;

 // Jumping straight to a sub-section from a search result: select the branch
 // and the leaf together, then clear the query so the tree is readable again.
 const goToChild = (sectionKey, childKey) => {
  if (sectionKey !== activeKey) onSelect(sectionKey);
  onSelectChild?.(childKey);
  setQuery('');
 };

 return (
  <div className="space-y-3">
   {/* Mobile: Select dropdowns */}
   <div className="lg:hidden space-y-2">
    <Select value={activeKey} onValueChange={onSelect}>
     <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
     <SelectContent>
      {sections.map(s => (
       <SelectItem key={s.key} value={s.key}>{t(s.label)}</SelectItem>
      ))}
     </SelectContent>
    </Select>
    {hasChildren && (
     <Select value={activeChildKey} onValueChange={onSelectChild}>
      <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
       {activeSection.children.map(c => (
        <SelectItem key={c.key} value={c.key}>{t(c.label)}</SelectItem>
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
      />
     </div>
    )}
    <div className="space-y-0.5">
     {filtered.map(section => {
      const isActive = activeKey === section.key;
      const Icon = section.icon;
      // While searching, every branch that holds a hit is open — otherwise the
      // result is invisible until you guess which tab it lives under.
      const showChildren = !!section.children?.length && !!onSelectChild
       && (q ? true : (isActive && hasChildren));
      return (
       <div key={section.key}>
        <button
         onClick={() => onSelect(section.key)}
         title={section.hint ? t(section.hint) : undefined}
         className={`relative w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          isActive
           ? 'bg-accent text-accent-foreground font-semibold'
           : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
         }`}
        >
         <Icon className="w-4 h-4 flex-shrink-0"/>
         <span>{t(section.label)}</span>
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
           const childActive = isActive && activeChildKey === child.key;
           const ChildIcon = child.icon;
           return (
            <button
             key={child.key}
             onClick={() => goToChild(section.key, child.key)}
             title={child.hint ? t(child.hint) : undefined}
             className={`relative w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              childActive
               ? 'bg-accent text-accent-foreground font-semibold'
               : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
             }`}
            >
             <ChildIcon className="w-3.5 h-3.5 flex-shrink-0"/>
             <span>{t(child.label)}</span>
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
     {q && filtered.length === 0 && (
      <p className="text-xs text-muted-foreground px-3 py-2">{t('אין הגדרה שתואמת')} "{query}"</p>
     )}
    </div>
   </div>
  </div>
 );
}
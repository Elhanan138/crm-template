import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon } from '@radix-ui/react-icons';

/**
 * Shared shell for every dashboard widget — gives a consistent, polished
 * "system language"look: soft gradient header strip, rounded icon chip,
 * subtle ring and hover lift. Keep all dashboard widgets visually aligned.
 */
export default function WidgetShell({
 title,
 subtitle,
 icon: Icon,
 to,
 toLabel = 'הכל',
 accent = 'primary', // 'primary' | 'amber' | 'rose' | 'sky'
 headerExtra,
 overflow = 0,
 children,
 className = '',
}) {
 const ACCENTS = {
  primary: { chip: 'bg-accent text-accent-foreground', glow: 'from-primary/5' },
  amber: { chip: 'bg-warning-muted text-warning', glow: 'from-warning' },
  rose: { chip: 'bg-destructive/10 text-destructive', glow: 'from-destructive' },
  sky: { chip: 'bg-info-muted text-info', glow: 'from-info' },
 };
 const a = ACCENTS[accent] || ACCENTS.primary;

 return (
  <motion.div
   initial={{ opacity: 0, y: 8 }}
   animate={{ opacity: 1, y: 0 }}
   whileHover={{ y: -2 }}
   transition={{ duration: 0.25, ease: 'easeOut' }}
   className={`group relative bg-card rounded-lg border border-border/70 shadow-sm hover:shadow-lg overflow-hidden h-full flex flex-col ${className}`}
  >
   {/* decorative corner glow */}
   <div className={`pointer-events-none absolute -top-16 -left-16 w-40 h-40 rounded-full bg-gradient-to-br ${a.glow} to-transparent opacity-70`} />
   <div className="relative flex items-center justify-between px-5 pt-5 pb-3">
    <div className="flex items-center gap-2.5 min-w-0">
     {Icon && (
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${a.chip}`}>
       <Icon className="w-[18px] h-[18px]"/>
      </div>
     )}
     <div className="min-w-0">
      <h3 className="text-sm font-bold text-foreground truncate leading-tight">{title}</h3>
      {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
     </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
     {headerExtra}
     {to && (
      <Link to={to} className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium">
       {toLabel} <ChevronLeftIcon className="w-3.5 h-3.5"/>
      </Link>
     )}
    </div>
   </div>
   <div className="relative flex-1 min-h-0 px-5 pb-3">{children}</div>
   {overflow > 0 && to && (
    <div className="relative px-5 pb-4">
     <Link to={to} className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium">
      +{overflow} נוספים <ChevronLeftIcon className="w-3.5 h-3.5"/>
     </Link>
    </div>
   )}
  </motion.div>
 );
}

export const WidgetEmpty = ({ text }) => (
 <div className="flex flex-col items-center justify-center py-8 text-center">
  <p className="text-sm text-muted-foreground">{text}</p>
 </div>
);
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TONE_ICONS = {
 neutral: 'bg-muted text-muted-foreground',
 primary: 'bg-accent text-accent-foreground',
 info: 'bg-info-muted text-info',
 success: 'bg-success-muted text-success',
 warning: 'bg-warning-muted text-warning',
 destructive: 'bg-destructive/10 text-destructive',
};

const TONE_BARS = {
 neutral: 'bg-muted-foreground/30',
 primary: 'bg-primary',
 info: 'bg-info',
 success: 'bg-success',
 warning: 'bg-warning',
 destructive: 'bg-destructive',
};

export default function KpiCard({
 icon: Icon,
 value,
 label,
 sub,
 tone = 'neutral',
 density = 'comfortable',
 progress,
 to,
 onClick,
 title,
}) {
 const toneClass = TONE_ICONS[tone] || TONE_ICONS.neutral;
 const barClass = TONE_BARS[tone] || TONE_BARS.neutral;
 const isLink = !!to;
 const isButton = !isLink && !!onClick;
 const isClickable = isLink || isButton;
 const isCompact = density === 'compact';

 const Comp = isLink ? Link : isButton ? 'button' : 'div';

 const containerClass = cn(
  'relative block h-full w-full bg-card border border-border shadow-sm rounded-lg text-start overflow-hidden',
  isCompact ? 'p-3.5' : 'p-5',
  isClickable && 'hover:border-primary/40 active:scale-[0.98] transition-all cursor-pointer',
 );

 const iconBoxClass = cn(
  'rounded-lg flex items-center justify-center flex-shrink-0',
  isCompact ? 'w-8 h-8' : 'w-10 h-10 mb-3',
  toneClass,
 );

 const valueClass = cn(
  ' font-bold text-foreground leading-none tabular-nums truncate min-w-0',
  isCompact ? 'text-xl' : 'text-2xl sm:text-3xl',
 );

 const iconSize = isCompact ? 'w-4 h-4' : 'w-5 h-5';

 const content = (
  <>
   {isCompact ? (
    <div className="flex items-center justify-between gap-2 min-w-0">
     <p className={valueClass} title={typeof value === 'string' ? value : undefined}>
      <bdi dir="ltr" className="inline-block max-w-full truncate align-bottom">{value}</bdi>
     </p>
     <div className={iconBoxClass}>
      <Icon className={iconSize} />
     </div>
    </div>
   ) : (
    <>
     <div className={iconBoxClass}>
      <Icon className={iconSize} />
     </div>
     <p className={valueClass} title={typeof value === 'string' ? value : undefined}>
      <bdi dir="ltr" className="inline-block max-w-full truncate align-bottom">{value}</bdi>
     </p>
    </>
   )}
   <p className="text-xs font-medium text-muted-foreground mt-2 truncate">{label}</p>
   {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
   {typeof progress === 'number' && (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
     <div
      className={cn('h-full transition-all duration-500', barClass)}
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
     />
    </div>
   )}
  </>
 );

 return (
  <motion.div
   initial={{ opacity: 0, scale: 0.96 }}
   animate={{ opacity: 1, scale: 1 }}
   transition={{ duration: 0.25, ease: 'easeOut' }}
   className="h-full"
  >
   <Comp
    to={isLink ? to : undefined}
    onClick={isButton ? onClick : undefined}
    className={containerClass}
    title={title}
    type={isButton ? 'button' : undefined}
   >
    {content}
   </Comp>
  </motion.div>
 );
}
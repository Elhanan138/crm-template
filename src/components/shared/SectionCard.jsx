import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Unified card wrapper: standard padding (p-5), rounded-lg, shadow-sm, border-border.
// Optional header with title (text-card-title), icon and actions.
export default function SectionCard({ title, icon: Icon, actions, children, className, bodyClassName, noPadding }) {
  const hasHeader = title || actions || Icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('bg-card rounded-lg border border-border shadow-sm', className)}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            {title && <h3 className="text-card-title truncate">{title}</h3>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(noPadding ? '' : (hasHeader ? 'px-5 pb-5' : 'p-5'), bodyClassName)}>
        {children}
      </div>
    </motion.div>
  );
}
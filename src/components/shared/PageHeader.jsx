import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon } from '@radix-ui/react-icons';
import BackButton from '@/components/shared/BackButton';

// Unified page header used across all pages.
// props: title, subtitle, icon, actions, breadcrumb ([{label, to}]), back (show BackButton above title)
export default function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb, back }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mb-6 sm:mb-8"
    >
      {back && (
        <div className="mb-4">
          <BackButton />
        </div>
      )}
      {Array.isArray(breadcrumb) && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-caption mb-2 flex-wrap">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronLeftIcon className="w-3 h-3" />}
              {b.to ? (
                <Link to={b.to} className="hover:text-foreground transition-colors">{b.label}</Link>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-page-title break-words sm:truncate">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center justify-end gap-2 flex-shrink-0 flex-wrap">{actions}</div>}
      </div>
    </motion.div>
  );
}
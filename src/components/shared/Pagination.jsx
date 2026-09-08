import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * Reusable pagination component — matches the design screenshot.
 * Square buttons with page numbers, active page has dark navy background,
 * arrow buttons for prev/next, "מציג X מתוך Y" text label.
 * Returns null when total <= pageSize (no pagination needed).
 */
export default function Pagination({ total, page, pageSize = 10, onPageChange, className = '' }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const showingCount = page < totalPages ? pageSize : total - (page - 1) * pageSize;

  // Calculate visible page numbers (max 5)
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`flex items-center justify-between ${className}`} dir="rtl">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="עמוד קודם"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ${
              p === page
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card border-border text-foreground hover:bg-muted'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="עמוד הבא"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <span className="text-xs text-muted-foreground">
        מציג {showingCount} מתוך {total}
      </span>
    </div>
  );
}
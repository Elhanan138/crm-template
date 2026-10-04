import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton that mirrors a vertical list of rows (notifications, comments, simple lists).
// props: count (default 5), className for wrapper
export default function ListSkeleton({ count = 5, className = 'space-y-2' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
          <Skeleton className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full max-w-[280px]" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
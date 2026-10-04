import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton that mirrors a responsive card grid.
// props: count (default 6), className for grid wrapper
export default function CardSkeleton({ count = 6, className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-2 mt-auto pt-1">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TABLE, THEAD_ROW, TH } from '@/components/shared/tableStyles';

// Skeleton that mirrors a table layout: header row + N body rows.
// props: rows (default 6), cols (default 5)
export default function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr className={THEAD_ROW}>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className={TH}><Skeleton className="h-3 w-16" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-border">
                {Array.from({ length: cols }).map((__, c) => (
                  <td key={c} className="py-3 px-4">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
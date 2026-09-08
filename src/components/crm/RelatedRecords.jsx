import React from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link2, ChevronLeft } from 'lucide-react';
import { relationsFor, matchesRelation } from '@/lib/crm/relations';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { useRecordViewer, visibleModuleRecords } from '@/lib/crm/visibility';

const MATCH_HINT = {
  account: 'שם הלקוח',
  exact: 'ערך משותף',
  id: 'שיוך ישיר',
};

/**
 * A compact strip of what else in the system touches this record.
 *
 * Deliberately read-only and link-out: the alternative — folding related
 * entities into the form — produces a window with dozens of fields that nobody
 * can scan. Here you see that a customer has 3 invoices and go read them.
 *
 * The counts are filtered by the same visibility rules as the lists they link
 * to. A number that counts rows you are not allowed to open is a leak, and it
 * also sends you to a page that will look empty.
 */
export default function RelatedRecords({ moduleId, record }) {
  const relations = relationsFor(moduleId, record);
  const viewer = useRecordViewer();

  const results = useQueries({
    queries: relations.map((rel) => ({
      queryKey: ['crm', rel.entity],
      queryFn: () => api.entities[rel.entity].list(),
      staleTime: 30000,
    })),
  });

  if (relations.length === 0) return null;

  const links = relations
    .map((rel, i) => ({
      rel,
      count: visibleModuleRecords(rel.to, results[i]?.data, viewer, CRM_SCHEMAS)
        .filter(matchesRelation(rel)).length,
    }))
    .filter((l) => l.count > 0);

  if (links.length === 0) return null;

  const hints = [...new Set(links.map((l) => MATCH_HINT[l.rel.match] || MATCH_HINT.exact))];

  return (
    <div className="pt-3 border-t border-border space-y-2">
      <div className="flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <p className="text-xs font-semibold text-muted-foreground">קשור לרשומה זו</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {links.map(({ rel, count }) => (
          <Link
            key={`${rel.to}-${rel.toField}`}
            to={rel.path}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs hover:border-primary/30 hover:text-primary transition-colors"
          >
            {rel.label}
            <span className="text-[10px] font-semibold bg-card rounded-full px-1.5">{count}</span>
            <ChevronLeft className="w-3 h-3 opacity-60 flex-shrink-0" />
          </Link>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        מבוסס על התאמה לפי {hints.join(' / ')} — אין צורך לקשר ידנית.
      </p>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import { useCapability } from '@/hooks/useCapability';

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY GATE
//
// הגדרות → יכולות המערכת can close a module or a whole workspace. That switch
// used to filter the sidebar and nothing else, so a closed module stayed fully
// reachable by typing its URL — and every link to it from search, a dashboard
// widget or a related-records strip still worked.
//
// The gate is applied to the ROUTE, which is the only place that can actually
// deny entry. Hiding the link remains a courtesy; this is the rule.
// ─────────────────────────────────────────────────────────────────────────────

export default function CapabilityGate({ moduleId, workspaceId, children }) {
  const moduleOpen = useCapability(moduleId ? `module:${moduleId}` : null);
  const workspaceOpen = useCapability(workspaceId ? `workspace:${workspaceId}` : null);

  if (moduleOpen && workspaceOpen) return children;

  return (
    <div className="pb-10">
      <EmptyState
        icon={ShieldOff}
        title="העמוד סגור"
        description="היכולת הזו נסגרה או הוגבלה למנהלי מערכת בהגדרות המערכת."
        action={
          <Button asChild variant="outline" className="rounded-full px-5">
            <Link to="/">חזרה לדף הבית</Link>
          </Button>
        }
      />
    </div>
  );
}

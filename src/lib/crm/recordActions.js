import { ArrowLeftRight } from 'lucide-react';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';

// ─────────────────────────────────────────────────────────────────────────────
// RECORD ACTIONS
//
// A record action is a HAND-OFF between two modules: it takes what one module
// already knows and starts the next step in another one, instead of making
// someone retype it.
//
// Everything is declared, so an action can only appear when both ends of the
// hand-off are part of this build — a bundle without `projects` shows no
// "convert to project" button, and nothing imports the target module's code.
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS = [
  {
    from: 'leads',
    requires: 'projects',
    key: 'lead-to-project',
    label: 'המרה לפרויקט',
    icon: ArrowLeftRight,
    hint: 'פותח אשף פרויקט חדש עם פרטי הליד, ומסמן את הליד כנסגר בהצלחה',
    // A lead becomes a project when it is won — offering it earlier invites a
    // project for a deal that has not closed.
    available: (record) => !!record?.id && !record.converted_project_id,
    to: (record) => {
      const params = new URLSearchParams({ lead_id: record.id });
      if (record.company) params.set('client_name', record.company);
      if (record.value) params.set('contract_value', String(record.value));
      return `${MODULES.projects.navPath}/new?${params.toString()}`;
    },
  },
];

/** Actions this build can offer for one record. */
export const recordActionsFor = (moduleId, record) =>
  ACTIONS.filter(
    (a) =>
      a.from === moduleId &&
      ACTIVE_MODULE_IDS.includes(a.requires) &&
      (!a.available || a.available(record))
  );

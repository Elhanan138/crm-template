import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Network, KeyRound } from 'lucide-react';
import { api } from '@/api/client';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { buildOrgTree, headcountUnder } from '@/lib/crm/orgChart';
import { AVAILABILITY, availability } from '@/lib/crm/derived';
import { cleanEmail } from '@/lib/permissions';
import { dotFor } from '@/lib/tones';
import { useI18n } from '@/lib/i18n';

const availabilityMeta = (value) => AVAILABILITY.find((a) => a.value === value) || AVAILABILITY[0];

function OrgNode({ node, depth, openRecord, logins, t }) {
  const [open, setOpen] = useState(depth < 2);
  const { employee, reports } = node;
  const state = availabilityMeta(availability(employee));
  const hasLogin = logins.has(cleanEmail(employee.email));
  const under = headcountUnder(node);

  return (
    <li>
      <div className="flex items-center gap-1.5 py-1">
        {reports.length > 0 ? (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t('כווץ') : t('הרחב')}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted flex-shrink-0"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : 'rtl:rotate-90 ltr:-rotate-90'}`} />
          </button>
        ) : <span className="w-5 flex-shrink-0" />}

        <button
          onClick={() => openRecord(employee)}
          className="flex items-center gap-2 min-w-0 rounded-lg px-2 py-1 hover:bg-muted/60 text-start"
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotFor(state.tone)}`} title={t(state.label)} />
          <span className="text-sm font-medium truncate">{employee.full_name}</span>
          {employee.role && <span className="text-[11px] text-muted-foreground truncate">{employee.role}</span>}
          {/* An employee whose email is a system user — the link between the
              HR record and the person who logs in. */}
          {hasLogin && <KeyRound className="w-3 h-3 text-muted-foreground flex-shrink-0" aria-label={t('משתמש במערכת')} />}
          {under > 0 && <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">· {under}</span>}
        </button>
      </div>

      {open && reports.length > 0 && (
        <ul className="ps-5 border-s border-border ms-2.5">
          {reports.map((r) => (
            <OrgNode key={r.employee.id} node={r} depth={depth + 1} openRecord={openRecord} logins={logins} t={t} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Who reports to whom. The structure was in the data — every employee names a
 * manager — and on no screen at all.
 */
function OrgChart({ records, openRecord }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const tree = useMemo(() => buildOrgTree(records), [records]);

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list('name'),
    enabled: shown,
  });
  const logins = useMemo(() => new Set(members.map((m) => cleanEmail(m.email)).filter(Boolean)), [members]);

  const away = records.filter((r) => availability(r) === 'away').length;
  const upcoming = records.filter((r) => availability(r) === 'upcoming').length;

  if (records.length === 0) return null;

  return (
    <div className="mb-4 bg-card border border-border rounded-xl">
      <button
        onClick={() => setShown((s) => !s)}
        aria-expanded={shown}
        className="w-full flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-start"
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold">
          <Network className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {t('מבנה ארגוני')}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {away > 0 && <>{away} {t('בחופשה היום')} · </>}
          {upcoming > 0 && <>{upcoming} {t('יוצאים בשבועיים הקרובים')} · </>}
          {shown ? t('הסתר') : t('הצג')}
        </span>
      </button>
      {shown && (
        <ul className="px-3 pb-3 overflow-x-auto">
          {tree.map((node) => (
            <OrgNode key={node.employee.id} node={node} depth={0} openRecord={openRecord} logins={logins} t={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Employees() {
  return <CrmModulePage schema={CRM_SCHEMAS.employees} moduleId="employees" renderAbove={(p) => <OrgChart {...p} />} />;
}

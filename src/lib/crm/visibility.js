import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { cleanEmail } from '@/lib/permissions';

// ─────────────────────────────────────────────────────────────────────────────
// RECORD VISIBILITY
//
// The system's permission model answers "may I edit this?" per record and "may
// I open this project?" per project. It had no answer for "may I SEE this row",
// so every CRM list returned every row to everyone who could log in — including
// salaries, candidates and the whole pipeline.
//
// Visibility is declared once per schema (`scope`) and enforced once here. No
// page implements it, so no page can forget it, and a module added later gets
// the default that its schema asks for.
//
//   'all'     – everyone who can log in (catalogues, shared operational data)
//   'own'     – records you own or are named on; admins see everything
//   'project' – records tied to a project you can open
//   'admin'   – admins only (personnel and pay data)
//
// The same predicate is used by the lists, by the related-records strip and by
// global search, so a record can never be invisible in one and countable in
// another.
// ─────────────────────────────────────────────────────────────────────────────

export const SCOPES = ['all', 'own', 'project', 'admin'];

export const scopeOf = (schema) => {
  const scope = schema?.scope;
  return SCOPES.includes(scope) ? scope : 'all';
};

const nameMatches = (value, name) =>
  !!name && String(value ?? '').trim().toLowerCase() === name;

/**
 * Is one record visible to one viewer?
 *
 * `viewer` is { isRealAdmin, email, fullName, projectIds } — a plain object, so
 * this stays testable and usable outside React.
 */
export function canSeeRecord(record, schema, viewer) {
  const scope = scopeOf(schema);
  if (viewer?.isRealAdmin) return true;
  if (scope === 'all') return true;
  if (scope === 'admin') return false;
  if (!record) return false;

  if (scope === 'project') {
    const projectId = record.project_id;
    // A record that belongs to no project is not hidden by a project rule —
    // hiding it would strand data nobody could ever reach again.
    return !projectId || !!viewer?.projectIds?.has(projectId);
  }

  // 'own' — ownership, or being named on the record by email or by name.
  const email = viewer?.email || '';
  if (email && cleanEmail(record.owner_email) === email) return true;
  if (email && cleanEmail(record.created_by) === email) return true;

  const name = viewer?.fullName || '';
  for (const field of schema?.fields || []) {
    const value = record[field.key];
    if (field.type === 'person') {
      if (field.by === 'name' ? nameMatches(value, name) : email && cleanEmail(value) === email) return true;
    } else if (schema.mineByName?.includes(field.key) && nameMatches(value, name)) {
      return true;
    }
  }
  return false;
}

/** Filter a list of records for one viewer. */
export const visibleRecords = (records, schema, viewer) =>
  scopeOf(schema) === 'all' || viewer?.isRealAdmin
    ? records || []
    : (records || []).filter((r) => canSeeRecord(r, schema, viewer));

// Modules that hold records without a schema. Their visibility is the project
// permission model itself, so the related-records strip and search obey exactly
// the same rule the project pages do.
const NON_SCHEMA_RULES = {
  projects: (record, viewer) => !!viewer?.projectIds?.has(record?.id),
  tasks: (record, viewer) => !record?.project_id || !!viewer?.projectIds?.has(record.project_id),
};

/**
 * Filter records of ANY module — schema-driven or not — for one viewer.
 * Used wherever records are counted or listed outside their own page.
 */
export function visibleModuleRecords(moduleId, records, viewer, schemas = {}) {
  if (viewer?.isRealAdmin) return records || [];
  const rule = NON_SCHEMA_RULES[moduleId];
  if (rule) return (records || []).filter((r) => rule(r, viewer));
  return visibleRecords(records, schemas[moduleId], viewer);
}

/**
 * The viewer object for the signed-in user. One query for the project list,
 * shared with useAccessControl through the same cache key.
 */
export function useRecordViewer() {
  const { isRealAdmin, effectiveUser, hasProject } = useAccessControl();

  const { data: projects = [] } = useQuery({
    queryKey: ['projectsCreatorMeta'],
    queryFn: () => api.entities.Project.list(),
    enabled: !isRealAdmin,
  });

  const email = cleanEmail(effectiveUser?.email);
  const fullName = (effectiveUser?.full_name || '').trim().toLowerCase();

  return useMemo(
    () => ({
      isRealAdmin,
      email,
      fullName,
      projectIds: new Set(projects.filter((p) => hasProject(p.id)).map((p) => p.id)),
    }),
    // hasProject closes over the same queries this hook reads; keying on the
    // project list plus identity is what actually changes the answer.
    [isRealAdmin, email, fullName, projects]
  );
}

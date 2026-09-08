import { describe, it, expect } from 'vitest';
import { buildReportSources, entityOf, groupSources, aggregatableColumns } from './registry';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { translateValue } from '@/components/reports/dataSources';

const sources = buildReportSources();

describe('report sources are derived from the manifest', () => {
  it('every schema-driven module in this build reports on itself', () => {
    const ids = new Set(sources.map((s) => s.id));
    for (const id of ACTIVE_MODULE_IDS) {
      if (!CRM_SCHEMAS[id]) continue;
      expect(ids.has(id), `${id} has no report`).toBe(true);
    }
  });

  it('never reports on a module that is not in this build', () => {
    for (const source of sources) {
      if (!source.module) continue;
      expect(ACTIVE_MODULE_IDS, `${source.id} reports on a missing module`).toContain(source.module);
    }
  });

  it('every source names a real entity and has columns', () => {
    for (const source of sources) {
      expect(entityOf(source), `${source.id} has no entity`).toBeTruthy();
      expect(source.columns.length, `${source.id} has no columns`).toBeGreaterThan(0);
      expect(source.label).toBeTruthy();
    }
  });

  it('gives every source something to group by', () => {
    for (const source of sources) {
      expect(source.columns.some((c) => c.groupable), `${source.id} cannot be grouped`).toBe(true);
    }
  });

  it('marks money and counts as aggregatable', () => {
    const money = sources.filter((s) => aggregatableColumns(s).length > 0);
    expect(money.length).toBeGreaterThan(3);
    for (const source of money) {
      for (const col of aggregatableColumns(source)) {
        expect(['currency', 'number']).toContain(col.type);
      }
    }
  });

  it('only adds the project column when the projects module is present', () => {
    const hasProjects = ACTIVE_MODULE_IDS.includes('projects');
    const derived = sources.filter((s) => s.columns.some((c) => c.key === 'project_name'));
    if (!hasProjects) expect(derived).toEqual([]);
  });

  it('groups sources by workspace and drops empty groups', () => {
    const groups = groupSources(sources);
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) expect(group.sources.length).toBeGreaterThan(0);
    expect(groups.flatMap((g) => g.sources)).toHaveLength(sources.length);
  });
});

describe('report values are readable', () => {
  it('translates every select option in every module', () => {
    for (const schema of Object.values(CRM_SCHEMAS)) {
      for (const field of schema.fields) {
        for (const option of field.options || []) {
          const label = translateValue(option.value);
          expect(label, `${schema.entity}.${field.key} = ${option.value}`).not.toBe(String(option.value));
        }
      }
    }
  });

  it('renders an empty value as a dash', () => {
    expect(translateValue('')).toBe('—');
    expect(translateValue(null)).toBe('—');
  });
});

describe('dashboard widgets follow the modules', () => {
  it('every schema-driven module in this build can produce a widget', async () => {
    const { widgetableModules } = await import('@/components/dashboard/ModuleWidget');
    const ids = widgetableModules(ACTIVE_MODULE_IDS);
    for (const id of ACTIVE_MODULE_IDS) {
      if (!CRM_SCHEMAS[id]) continue;
      expect(ids, `${id} has no widget`).toContain(id);
    }
  });

  it('never offers a widget for a module that is not in this build', async () => {
    const { widgetableModules } = await import('@/components/dashboard/ModuleWidget');
    for (const id of widgetableModules(ACTIVE_MODULE_IDS)) {
      expect(ACTIVE_MODULE_IDS).toContain(id);
    }
  });

  it('every module a widget covers has something to show', () => {
    for (const id of ACTIVE_MODULE_IDS) {
      const schema = CRM_SCHEMAS[id];
      if (!schema) continue;
      const hasStatus = schema.fields.some((f) => f.type === 'select');
      const hasMoney = schema.fields.some((f) => f.type === 'currency');
      const hasCount = schema.fields.length > 0;
      expect(hasStatus || hasMoney || hasCount, `${id} widget would be empty`).toBe(true);
    }
  });
});

describe('module relations', () => {
  // Modules that hold records without a schema take part in the graph too.
  // Their linking fields are listed here so that a typo in a relation still
  // fails the suite instead of producing a link that silently matches nothing.
  const NON_SCHEMA_FIELDS = {
    projects: ['id', 'client_name', 'project_manager', 'current_liaison'],
    tasks: ['id', 'project_id', 'assigned_to'],
  };

  const fieldsOf = (moduleId) =>
    CRM_SCHEMAS[moduleId]
      ? CRM_SCHEMAS[moduleId].fields.map((f) => f.key).concat('id')
      : NON_SCHEMA_FIELDS[moduleId];

  it('every relation points at real modules and real fields', async () => {
    const { RELATIONS, entityForModule } = await import('@/lib/crm/relations');
    const { MODULES, MODULE_IDS } = await import('@/lib/modules');
    for (const rel of RELATIONS) {
      expect(MODULE_IDS, `unknown module ${rel.from}`).toContain(rel.from);
      expect(MODULE_IDS, `unknown module ${rel.to}`).toContain(rel.to);
      expect(MODULES[rel.to].navPath, `${rel.to} has no path`).toBeTruthy();
      expect(entityForModule(rel.to), `${rel.to} has no entity`).toBeTruthy();
      expect(['account', 'exact', 'id'], `${rel.from}→${rel.to} match mode`).toContain(rel.match);
      expect(fieldsOf(rel.from), `${rel.from}.${rel.fromField}`).toContain(rel.fromField);
      expect(fieldsOf(rel.to), `${rel.to}.${rel.toField}`).toContain(rel.toField);
    }
  });

  it('only offers relations whose target module is in this build', async () => {
    const { relationsFor } = await import('@/lib/crm/relations');
    const relations = relationsFor('leads', { company: 'Acme' });
    for (const rel of relations) expect(ACTIVE_MODULE_IDS).toContain(rel.to);
  });

  it('offers nothing when the linking value is empty', async () => {
    const { relationsFor } = await import('@/lib/crm/relations');
    expect(relationsFor('leads', { company: '' })).toEqual([]);
    expect(relationsFor('leads', {})).toEqual([]);
    expect(relationsFor('leads', null)).toEqual([]);
  });

  it('matches case-insensitively on the linking value', async () => {
    const { relationsFor, matchesRelation } = await import('@/lib/crm/relations');
    const [rel] = relationsFor('leads', { company: 'Acme' });
    if (!rel) return;
    expect(matchesRelation(rel)({ [rel.toField]: 'ACME' })).toBe(true);
    expect(matchesRelation(rel)({ [rel.toField]: 'other' })).toBe(false);
  });
});

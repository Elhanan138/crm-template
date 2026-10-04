import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { ChevronLeft } from 'lucide-react';
import { CRM_SCHEMAS, TONE_CLASS } from '@/lib/crm/schemas';
import { MODULES } from '@/lib/modules';
import { NAV_ICONS } from '@/lib/navIcons';
import { currency } from '@/lib/crm/useCrmRecords';

// ─────────────────────────────────────────────────────────────────────────────
// One widget shape, generated per module from its schema. The breakdown uses
// the module's own status field and its own currency field, so a new module
// gets a working home-page card the moment it is declared — with no widget code.
// ─────────────────────────────────────────────────────────────────────────────

/** The field a module uses for status, if it has one. */
const statusFieldOf = (schema) =>
  schema.fields.find((f) => f.type === 'select' && f.options?.[0]?.tone !== undefined) ||
  schema.fields.find((f) => f.type === 'select');

const moneyFieldOf = (schema) => schema.fields.find((f) => f.type === 'currency');

export default function ModuleWidget({ moduleId }) {
  const schema = CRM_SCHEMAS[moduleId];
  const module = MODULES[moduleId];
  const Icon = NAV_ICONS[module?.icon];

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['crm', schema?.entity],
    queryFn: () => api.entities[schema.entity].list(),
    enabled: !!schema,
    staleTime: 30000,
  });

  const summary = useMemo(() => {
    if (!schema) return null;
    const statusField = statusFieldOf(schema);
    const moneyField = moneyFieldOf(schema);

    const breakdown = statusField
      ? statusField.options
          .map((option) => ({
            ...option,
            count: records.filter((r) => String(r[statusField.key]) === String(option.value)).length,
          }))
          .filter((o) => o.count > 0)
          .slice(0, 4)
      : [];

    const total = moneyField
      ? records.reduce((sum, r) => sum + Number(r[moneyField.key] || 0), 0)
      : null;

    return { breakdown, total, moneyLabel: moneyField?.label };
  }, [records, schema]);

  if (!schema || !summary) return null;

  return (
    <Link
      to={module.navPath}
      className="block bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <h3 className="text-sm font-bold truncate">{schema.title}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-lg font-bold leading-none">
            {isLoading ? '—' : records.length.toLocaleString()}
          </span>
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>

      {summary.total > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          {summary.moneyLabel}: <span className="font-semibold text-foreground" dir="ltr">{currency(summary.total)}</span>
        </p>
      )}

      {summary.breakdown.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {summary.breakdown.map((option) => (
            <span
              key={String(option.value)}
              className={`text-[10px] px-2 py-0.5 rounded-full ${TONE_CLASS[option.tone] || TONE_CLASS.muted}`}
            >
              {option.label} {option.count}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {records.length === 0 ? 'אין עדיין רשומות' : `${records.length} רשומות`}
        </p>
      )}
    </Link>
  );
}

/** Modules that can produce a widget — i.e. every schema-driven module. */
export const widgetableModules = (activeIds) => activeIds.filter((id) => CRM_SCHEMAS[id]);

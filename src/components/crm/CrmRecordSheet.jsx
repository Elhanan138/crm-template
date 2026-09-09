import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import RelatedRecords from '@/components/crm/RelatedRecords';
import { recordActionsFor } from '@/lib/crm/recordActions';
import { isDerived } from '@/lib/crm/derived';
import { useI18n } from '@/lib/i18n';
import RecordTrail, { TRAIL_TABS } from '@/components/crm/RecordTrail';
import { validateCustomFields } from '@/lib/customFields';
import CrmFormFields from '@/components/crm/CrmFormFields';
import { useFormLayout } from '@/lib/useFormLayout';
import LineItemsEditor from '@/components/crm/LineItemsEditor';
import { LINE_FIELD, lineSourceFor, lineTotals, cleanLines } from '@/lib/crm/lineItems';



const defaultsFor = (schema) =>
  Object.fromEntries(
    schema.fields
      .filter((f) => f.default !== undefined)
      .map((f) => [f.key, f.default])
  );

export default function CrmRecordSheet({
  open, onOpenChange, schema, record, relations, customFields = [], onSave, saving, readOnly, moduleId,
}) {
  const { t, dir } = useI18n();
  const [form, setForm] = useState(() => ({ ...defaultsFor(schema), ...(record || {}) }));
  const [errors, setErrors] = useState({});
  const handOffs = recordActionsFor(moduleId, record);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  // Documents that carry lines: the total is what the lines come to, always.
  // Two places holding the same number is two places that can disagree, and the
  // one people trust is the one they can see itemised.
  const lineSource = lineSourceFor(moduleId);
  const setLines = (lines) => {
    setForm((f) => {
      const next = { ...f, [LINE_FIELD]: lines };
      const totals = lineTotals(lines, lineSource.vatField ? f[lineSource.vatField] : 0);
      if (lines.length > 0) next[lineSource.totalField] = totals.subtotal;
      return next;
    });
    setErrors((e) => (e[lineSource.totalField] ? { ...e, [lineSource.totalField]: undefined } : e));
  };

  const submit = () => {
    const next = {};
    for (const field of schema.fields) {
      if (!field.required) continue;
      const v = form[field.key];
      if (field.type === 'checkbox' ? v !== true : !String(v ?? '').trim()) {
        next[field.key] = 'שדה חובה';
      }
    }
    const missingCustom = validateCustomFields(customFields, form.custom_fields || {});
    if (Object.keys(next).length || missingCustom.length) {
      setErrors(next);
      toast.error(
        missingCustom.length
          ? `שדות חובה חסרים: ${missingCustom.join(', ')}`
          : 'יש למלא את שדות החובה'
      );
      return;
    }
    // Derived values are answers, not data. Persisting them would freeze a
    // number that must keep tracking its inputs.
    const stored = { ...form };
    for (const field of schema.fields) if (isDerived(field)) delete stored[field.key];
    if (lineSource) stored[LINE_FIELD] = cleanLines(form[LINE_FIELD]);
    onSave(stored);
  };

  // The order this form asks its questions in, as set in
  // הגדרות → שדות מותאמים. Untouched, it is the schema's own order followed by
  // the custom fields — which is what it has always been.
  const layout = useFormLayout(schema.entity, customFields);

  // The record's history, activity and files. They belong to the record rather
  // than to any field, so they sit in the header as icons instead of taking a
  // labelled row each at the foot of a form people already scroll.
  const [trailTab, setTrailTab] = useState(null);
  const [trailCounts, setTrailCounts] = useState({});

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} dir={dir} className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border text-start">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>
                {readOnly ? schema.singular : record?.id ? `עריכת ${schema.singular}` : `${schema.singular} חדש`}
              </SheetTitle>
              <SheetDescription>
                {readOnly ? 'אין לך הרשאת עריכה לרשומה הזו.' : schema.subtitle}
              </SheetDescription>
            </div>

            {/* Only a saved record has a story to show. */}
            {record?.id && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {TRAIL_TABS.map((item) => {
                  const open = trailTab === item.id;
                  const count = trailCounts[item.id] || 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={t(item.label)}
                      aria-label={t(item.label)}
                      aria-pressed={open}
                      onClick={() => setTrailTab(open ? null : item.id)}
                      className={`relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                        open
                          ? 'bg-accent text-accent-foreground border-primary/30'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {count > 0 && (
                        <span className="absolute -top-1 -end-1 min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center tabular-nums">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            <CrmFormFields
              schema={schema}
              layout={layout}
              form={form}
              set={set}
              errors={errors}
              relations={relations}
              readOnly={readOnly}
              lineSource={lineSource}
            />
            {lineSource && (
              <LineItemsEditor
                source={lineSource}
                value={form[LINE_FIELD] || []}
                onChange={setLines}
                vatPercent={lineSource.vatField ? Number(form[lineSource.vatField]) || 0 : 0}
                readOnly={readOnly}
              />
            )}
          </div>

          {/* Hand-offs to another module — only those this build can serve. */}
          {record?.id && moduleId && handOffs.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{t('המשך תהליך')}</p>
              {handOffs.map((action) => (
                <div key={action.key} className="space-y-1">
                  <Button asChild variant="outline" size="sm" className="rounded-full h-8 px-3.5 text-xs gap-1.5">
                    <Link to={action.to(record)}>
                      <action.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {t(action.label)}
                    </Link>
                  </Button>
                  {action.hint && <p className="text-[10px] text-muted-foreground">{t(action.hint)}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Links out to related records — never merged into this form. */}
          {record?.id && moduleId && <RelatedRecords moduleId={moduleId} record={record} />}

          {/* What changed, what people did, what is attached — opened from the
              header, so it costs nothing until it is asked for. */}
          {record?.id && (
            <div className={trailTab ? 'pt-3 mt-3 border-t border-border' : 'hidden'}>
              <RecordTrail
                schema={schema}
                entity={schema.entity}
                record={record}
                activeTab={trailTab || 'history'}
                onCounts={setTrailCounts}
              />
            </div>
          )}

        </div>

        {!readOnly && (
          <div className="px-5 py-3 border-t border-border flex justify-start gap-2">
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמירה
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

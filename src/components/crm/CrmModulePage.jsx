import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Lock } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import CardSkeleton from '@/components/shared/CardSkeleton';
import CrmRecordSheet from './CrmRecordSheet';
import { useCrmRecords, filterRecords, formatValue } from '@/lib/crm/useCrmRecords';
import { TONE_CLASS } from '@/lib/crm/schemas';

export function StatusPill({ meta }) {
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${TONE_CLASS[meta.tone] || TONE_CLASS.muted}`}>
      {meta.label}
    </span>
  );
}

/**
 * One page for any CRM entity. The schema decides the columns, the filters and
 * the form; this component decides nothing about a specific entity.
 *
 * `renderAbove` lets a module add its own view (a pipeline board, a timeline)
 * without forking the list.
 */
export default function CrmModulePage({ schema, moduleId, renderAbove, extraActions, onOpenRecord, EditorComponent }) {
  const {
    records, isLoading, relations, lookups, customFields,
    save, remove, canEdit, canDelete,
  } = useCrmRecords(schema);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sheetRecord, setSheetRecord] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const visible = filterRecords(records, schema, { search, filters });
  const columns = schema.fields.filter((f) => f.list);
  const Icon = schema.icon;

  const openNew = () => { setSheetRecord(null); setSheetOpen(true); };
  // A module can send a row somewhere richer than the edit sheet.
  const openRecord = (record) => {
    if (onOpenRecord) return onOpenRecord(record);
    setSheetRecord(record);
    setSheetOpen(true);
  };
  const openEditor = (record) => { setSheetRecord(record); setSheetOpen(true); };

  const handleSave = (form) => {
    save.mutate(form, { onSuccess: () => setSheetOpen(false) });
  };

  const cell = (field, record) => {
    const raw = record[field.key];
    if (field.type === 'select' && field.options?.[0]?.tone !== undefined) {
      return <StatusPill meta={field.options.find((o) => String(o.value) === String(raw))} />;
    }
    return <span className={field.type === 'currency' ? 'font-medium' : ''} dir={['currency', 'number', 'percent', 'email', 'phone'].includes(field.type) ? 'ltr' : undefined}>
      {formatValue(field, raw, lookups)}
    </span>;
  };

  return (
    <div dir="rtl" className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-10">
      <PageHeader
        icon={Icon}
        title={schema.title}
        subtitle={schema.subtitle}
        actions={
          <div className="flex items-center gap-2">
            {extraActions}
            <Button onClick={openNew} className="rounded-full h-9 px-4 text-sm gap-1.5">
              <Plus className="w-4 h-4" /> {schema.singular} חדש
            </Button>
          </div>
        }
      />

      {renderAbove?.({ records, lookups, openRecord })}

      {/* Search + filters — stacks on mobile, one row from sm up */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`חיפוש ב${schema.title}...`}
            className="h-9 rounded-lg pr-9 text-sm"
          />
        </div>
        {(schema.filters || []).map((f) => (
          <Select
            key={f.key}
            value={String(filters[f.key] ?? 'all')}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, [f.key]: v === 'all' ? 'all' : f.options.find((o) => String(o.value) === v)?.value ?? v }))}
          >
            <SelectTrigger className="h-9 rounded-lg text-sm w-full sm:w-44"><SelectValue placeholder={f.label} /></SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">כל ה{f.label}</SelectItem>
              {f.options.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
      </div>

      {isLoading ? (
        <CardSkeleton count={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={records.length === 0 ? `אין עדיין ${schema.title}` : 'לא נמצאו תוצאות'}
          description={records.length === 0 ? `צור ${schema.singular} ראשון כדי להתחיל.` : 'נסה לשנות את החיפוש או את הסינון.'}
          action={records.length === 0 ? (
            <Button onClick={openNew} className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> {schema.singular} חדש</Button>
          ) : null}
        />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map((f) => (
                    <th key={f.key} className="text-right font-semibold text-xs text-muted-foreground px-3 py-2.5 truncate">{f.label}</th>
                  ))}
                  <th className="w-24 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => openRecord(record)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    {columns.map((f) => (
                      <td key={f.key} className="px-3 py-2.5 truncate">{cell(f, record)}</td>
                    ))}
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        {canEdit(record) ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(record)} aria-label="עריכה">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <span className="inline-flex w-7 h-7 items-center justify-center text-muted-foreground" title="אין הרשאת עריכה">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {canDelete(record) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setPendingDelete(record)} aria-label="מחיקה">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {visible.map((record) => (
              <button
                key={record.id}
                onClick={() => openRecord(record)}
                className="w-full text-right bg-card border border-border rounded-xl p-3.5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold truncate min-w-0">{record[schema.titleField] || '—'}</p>
                  {columns.filter((f) => f.type === 'select' && f.options?.[0]?.tone !== undefined).slice(0, 1).map((f) => (
                    <span key={f.key} className="flex-shrink-0">{cell(f, record)}</span>
                  ))}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {columns.filter((f) => f.key !== schema.titleField && !(f.type === 'select' && f.options?.[0]?.tone !== undefined)).slice(0, 4).map((f) => (
                    <div key={f.key} className="min-w-0">
                      <dt className="text-[10px] text-muted-foreground truncate">{f.label}</dt>
                      <dd className="text-xs truncate">{cell(f, record)}</dd>
                    </div>
                  ))}
                </dl>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground mt-3">
            {visible.length} מתוך {records.length}
          </p>
        </>
      )}

      {sheetOpen && EditorComponent && (
        <EditorComponent
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          rule={sheetRecord}
          onSave={handleSave}
          saving={save.isPending}
          readOnly={sheetRecord?.id ? !canEdit(sheetRecord) : false}
        />
      )}

      {sheetOpen && !EditorComponent && (
        <CrmRecordSheet
          moduleId={moduleId}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          schema={schema}
          record={sheetRecord}
          relations={relations}
          customFields={customFields}
          onSave={handleSave}
          saving={save.isPending}
          readOnly={sheetRecord?.id ? !canEdit(sheetRecord) : false}
        />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הרשומה?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.[schema.titleField] || schema.singular} יימחק לצמיתות. אי אפשר לבטל את הפעולה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { remove.mutate(pendingDelete.id); setPendingDelete(null); }}
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

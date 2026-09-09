import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Search, Pencil, Trash2, Lock, ShieldOff, ArrowUpDown, ArrowUp, ArrowDown,
  Download, LayoutGrid, List, Layers, X, AlertTriangle, ChevronDown, UserCheck, CopyCheck,
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import CardSkeleton from '@/components/shared/CardSkeleton';
import Pagination from '@/components/shared/Pagination';
import CrmRecordSheet from './CrmRecordSheet';
import BoardView, { StatStrip } from './BoardView';
import ColumnPicker from './ColumnPicker';
import DuplicatesDialog from './DuplicatesDialog';
import InlineEditCell, { canEditInline } from './InlineEditCell';
import InlineEditTrigger from '@/components/shared/InlineEditTrigger';
import { useCrmRecords, filterRecords, formatValue, currency } from '@/lib/crm/useCrmRecords';
import { TONE_CLASS } from '@/lib/crm/schemas';
import { readField } from '@/lib/crm/derived';
import { useI18n, translateSchema } from '@/lib/i18n';
import { useTablePrefs, PAGE_SIZES } from '@/lib/crm/tablePrefs';
import { findDuplicates } from '@/lib/crm/duplicates';
import {
  statsFor, segmentsFor, groupOptionsFor, boardConfigFor, sortRecords,
  groupRecords, toCsv, isOverdue, statusFieldOf, moneyFieldOf,
} from '@/lib/crm/insights';

export function StatusPill({ meta }) {
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${TONE_CLASS[meta.tone] || TONE_CLASS.muted}`}>
      {meta.label}
    </span>
  );
}

const NO_GROUP = '__none__';

/**
 * One page for any CRM entity. The schema decides the columns, the filters and
 * the form; this component decides nothing about a specific entity.
 *
 * It is also where a flat table becomes a place to work: headline numbers,
 * saved segments, sorting, grouping with subtotals, a board, inline editing,
 * chosen columns, paging, bulk edits with an undo, duplicate detection and a
 * CSV export — derived in src/lib/crm/insights.js from fields the schema
 * already declares. Written once here, every module gets it.
 *
 * `renderAbove` lets a module add its own view (an aging table, an MRR strip)
 * without forking the list. Such a module passes `stats={false}` so its own
 * numbers are not repeated by the generic ones.
 */
export default function CrmModulePage({
  schema: rawSchema, moduleId, renderAbove, extraActions, onOpenRecord, EditorComponent, stats = true,
}) {
  const { t, dir, lang } = useI18n();
  // Labels are translated, keys and stored values are never touched.
  const schema = useMemo(() => translateSchema(rawSchema, t), [rawSchema, lang, t]);

  const {
    records, isLoading, relations, lookups, customFields,
    save, remove, bulkSave, bulkRemove,
    canEdit, canDelete, isRealAdmin, hiddenCount, scope, myEmail, viewer,
  } = useCrmRecords(schema);

  // Links from other modules arrive filtered: ?q= seeds the search box, and
  // ?recordId= opens one record straight away. A related-records link therefore
  // lands on the rows it promised, not on the whole module.
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filters, setFilters] = useState({});
  const [segmentId, setSegmentId] = useState('all');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [groupKey, setGroupKey] = useState('');
  const [view, setView] = useState('table');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // { id, key }
  const [sheetRecord, setSheetRecord] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);

  const { columns, pageSize, toggleColumn, resetColumns, setPageSize } = useTablePrefs(moduleId, schema);

  const Icon = schema.icon;
  const statusField = statusFieldOf(schema);
  const moneyField = moneyFieldOf(schema);
  const board = boardConfigFor(schema);
  const groupOptions = groupOptionsFor(schema);

  const segments = useMemo(
    () => segmentsFor(schema, { myEmail, myName: viewer?.fullName || '' }),
    [schema, myEmail, viewer]
  );
  const segment = segments.find((s) => s.id === segmentId) || segments[0];

  const headline = useMemo(
    () => (stats ? statsFor(schema, records, { formatCurrency: currency }) : []),
    [stats, schema, records]
  );

  const visible = useMemo(
    () => sortRecords(filterRecords(records.filter(segment.test), schema, { search, filters }), sort, schema),
    [records, segment, schema, search, filters, sort]
  );

  const duplicateCount = useMemo(
    () => findDuplicates(schema, records).length,
    [schema, records]
  );

  // Paging applies to the flat table only. A board shows its columns whole, and
  // a grouped table paged mid-group would cut a subtotal in half.
  const paged = useMemo(() => {
    if (groupKey || view === 'board') return visible;
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize, groupKey, view]);

  const grouped = useMemo(
    () => groupRecords(visible, groupKey, schema, (field, value) => formatValue(field, value, lookups)),
    [visible, groupKey, schema, lookups]
  );

  // A selection or a page number that survives a filter change would act on, or
  // point at, rows you can no longer see.
  useEffect(() => { setSelected(new Set()); setPage(1); }, [segmentId, search, filters, groupKey, pageSize]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(visible.length / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [visible.length, pageSize, page]);

  const openNew = () => { setSheetRecord(null); setSheetOpen(true); };
  const openRecord = (record) => {
    if (onOpenRecord) return onOpenRecord(record);
    setSheetRecord(record);
    setSheetOpen(true);
  };
  const openEditor = (record) => { setSheetRecord(record); setSheetOpen(true); };

  // A quick action from global search asks for the create form directly. It is
  // the same sheet the page's own button opens — not a second way in.
  const wantsNew = searchParams.get('new');
  useEffect(() => {
    if (!wantsNew) return;
    setSheetRecord(null);
    setSheetOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [wantsNew]);

  // Open a record named in the URL once it has loaded, then drop the param so
  // a refresh or a back-navigation does not reopen the sheet.
  const requestedId = searchParams.get('recordId');
  useEffect(() => {
    if (!requestedId || isLoading) return;
    const target = records.find((r) => r.id === requestedId);
    if (target) openRecord(target);
    const next = new URLSearchParams(searchParams);
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  }, [requestedId, isLoading, records]);

  const handleSave = (form) => save.mutate(form, { onSuccess: () => setSheetOpen(false) });

  const commitInline = (record, field, value) => {
    setEditing(null);
    if (String(value ?? '') === String(record[field.key] ?? '')) return;
    save.mutate({ ...record, [field.key]: value });
  };

  const mergeDuplicates = ({ merged, removeIds }) => {
    save.mutate(merged, {
      onSuccess: () => bulkRemove.mutate(removeIds),
    });
  };

  const toggleSort = (key) =>
    setSort((prev) => (prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }));

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const pageRows = groupKey ? visible : paged;
  const allVisibleSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(pageRows.map((r) => r.id)));
  const selectedIds = [...selected];

  const exportCsv = () => {
    const csv = toCsv(visible, columns, (field, value) => formatValue(field, value, lookups));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.title}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cell = (field, record) => {
    const raw = readField(field, record);
    if (field.type === 'select' && field.options?.[0]?.tone !== undefined) {
      return <StatusPill meta={field.options.find((o) => String(o.value) === String(raw))} />;
    }
    return (
      <span
        className={field.type === 'currency' ? 'font-medium' : ''}
        dir={['currency', 'number', 'percent', 'email', 'phone'].includes(field.type) ? 'ltr' : undefined}
      >
        {formatValue(field, raw, lookups)}
      </span>
    );
  };

  // A module the viewer may not read at all says so, instead of rendering an
  // empty list with a create button that would produce invisible records.
  const restricted = scope === 'admin' && !isRealAdmin;

  const headerCell = (field) => {
    const active = sort.key === field.key;
    const SortIcon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th
        key={field.key}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className="text-start font-semibold text-xs text-muted-foreground px-3 py-2.5"
      >
        <button
          onClick={() => toggleSort(field.key)}
          className={`inline-flex items-center gap-1 max-w-full hover:text-foreground transition-colors ${active ? 'text-foreground' : ''}`}
        >
          <span className="truncate">{field.label}</span>
          <SortIcon className="w-3 h-3 flex-shrink-0 opacity-70" />
        </button>
      </th>
    );
  };

  const rowsOf = (items) => items.map((record) => {
    const late = isOverdue(schema, record);
    const editable = canEdit(record);
    return (
      <tr
        key={record.id}
        onClick={() => openRecord(record)}
        className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selected.has(record.id) ? 'bg-accent' : ''}`}
      >
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.has(record.id)} onCheckedChange={() => toggleRow(record.id)} aria-label={t('בחירת שורה')} />
        </td>
        {columns.map((f, i) => {
          const isEditing = editing?.id === record.id && editing?.key === f.key;
          const inlineable = canEditInline(f, editable);
          return (
            <td key={f.key} className="px-3 py-2.5 truncate">
              {isEditing ? (
                <InlineEditCell
                  field={f}
                  value={record[f.key]}
                  saving={save.isPending}
                  onCommit={(value) => commitInline(record, f, value)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <InlineEditTrigger
                  disabled={!inlineable}
                  title={t('לחיצה לעריכה מהירה')}
                  onEdit={() => setEditing({ id: record.id, key: f.key })}
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                    {i === 0 && late && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                    <span className="truncate">{cell(f, record)}</span>
                  </span>
                </InlineEditTrigger>
              )}
            </td>
          );
        })}
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-0.5">
            {editable ? (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(record)} aria-label={t('עריכה')}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <span className="inline-flex w-7 h-7 items-center justify-center text-muted-foreground" title={t('אין הרשאת עריכה')}>
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}
            {canDelete(record) && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setPendingDelete(record)} aria-label={t('מחיקה')}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  });

  const table = (items) => (
    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr className="border-b border-border bg-muted/40">
          <th className="w-10 px-3 py-2.5">
            <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label={t('בחירת הכל')} />
          </th>
          {columns.map(headerCell)}
          <th className="w-24 px-3 py-2.5" />
        </tr>
      </thead>
      <tbody>{rowsOf(items)}</tbody>
    </table>
  );

  const groupTotal = (items) =>
    moneyField ? items.reduce((s, r) => s + Number(readField(moneyField, r) || 0), 0) : 0;

  return (
    <div dir={dir} className="pb-10">
      <PageHeader
        icon={Icon}
        title={schema.title}
        subtitle={schema.subtitle}
        actions={
          restricted ? null : (
            <div className="flex items-center gap-2">
              {extraActions}
              {duplicateCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setDuplicatesOpen(true)}
                  className="rounded-full h-9 px-3.5 text-sm gap-1.5"
                  title={t('כפילויות')}
                >
                  <CopyCheck className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{t('כפילויות')}</span>
                  <span className="text-[10px] tabular-nums opacity-70">{duplicateCount}</span>
                </Button>
              )}
              <ColumnPicker
                schema={schema}
                visibleKeys={columns.map((f) => f.key)}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
              {visible.length > 0 && (
                <Button variant="outline" onClick={exportCsv} className="rounded-full h-9 px-3.5 text-sm gap-1.5" title={t('ייצוא התצוגה הנוכחית ל-CSV')}>
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{t('ייצוא')}</span>
                </Button>
              )}
              <Button onClick={openNew} className="rounded-full h-9 px-4 text-sm gap-1.5">
                <Plus className="w-4 h-4 flex-shrink-0" /> {schema.singular}
              </Button>
            </div>
          )
        }
      />

      {restricted && (
        <EmptyState
          icon={ShieldOff}
          title={t('אין לך גישה למודול הזה')}
          description={`${schema.title} — ${t('זמין למנהלי מערכת בלבד')}`}
        />
      )}

      {!restricted && (<>
        {headline.length > 0 && <StatStrip stats={headline} />}

        {renderAbove?.({ records, lookups, openRecord })}

        {/* Segments — open on the slice you work in, not on every row ever created */}
        {segments.length > 1 && records.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-0.5">
            {segments.map((s) => {
              const count = records.filter(s.test).length;
              const active = s.id === segment.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSegmentId(s.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs border transition-colors ${
                    active
                      ? 'bg-accent text-accent-foreground border-primary/30 font-semibold'
                      : 'bg-card border-border text-muted-foreground font-medium hover:text-foreground'
                  }`}
                >
                  {t(s.label)}
                  <span className="text-[10px] tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search, filters, grouping and the view switch */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t('חיפוש')} — ${schema.title}`}
              className="h-9 rounded-lg pe-9 text-sm"
            />
          </div>

          {(schema.filters || []).map((f) => (
            <Select
              key={f.key}
              value={String(filters[f.key] ?? 'all')}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, [f.key]: v === 'all' ? 'all' : f.options.find((o) => String(o.value) === v)?.value ?? v }))}
            >
              <SelectTrigger className="h-9 rounded-lg text-sm w-full sm:w-44"><SelectValue placeholder={f.label} /></SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">{`${t('הכל')} — ${f.label}`}</SelectItem>
                {f.options.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}

          {groupOptions.length > 0 && view === 'table' && (
            <Select value={groupKey || NO_GROUP} onValueChange={(v) => setGroupKey(v === NO_GROUP ? '' : v)}>
              <SelectTrigger className="h-9 rounded-lg text-sm w-full sm:w-44 gap-1.5">
                <Layers className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                <SelectValue placeholder={t('קיבוץ')} />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value={NO_GROUP}>{t('ללא קיבוץ')}</SelectItem>
                {groupOptions.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {board && (
            <div className="flex bg-muted/50 rounded-full p-0.5 flex-shrink-0 self-start">
              <Button
                variant="ghost" size="icon"
                className={`h-8 w-8 rounded-full ${view === 'table' ? 'bg-card shadow-sm' : ''}`}
                onClick={() => setView('table')} aria-label={t('תצוגת רשימה')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className={`h-8 w-8 rounded-full ${view === 'board' ? 'bg-card shadow-sm' : ''}`}
                onClick={() => setView('board')} aria-label={t('תצוגת לוח')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Bulk bar — appears only with a selection, and says what it will act on */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 mb-3 rounded-xl border border-primary/30 bg-accent px-3 py-2 flex-wrap">
            <span className="text-xs font-semibold">{selectedIds.length} {t('נבחרו')}</span>

            {statusField && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 rounded-full text-xs gap-1 bg-card">
                    {statusField.label} <ChevronDown className="w-3 h-3 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent dir={dir} align="end">
                  <DropdownMenuLabel className="text-xs">{statusField.label}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusField.options.map((o) => (
                    <DropdownMenuItem
                      key={String(o.value)}
                      onClick={() => bulkSave.mutate({ ids: selectedIds, patch: { [statusField.key]: o.value } })}
                    >
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {myEmail && schema.fields.some((f) => f.type === 'person') && (
              <Button
                variant="outline" size="sm" className="h-7 rounded-full text-xs gap-1 bg-card"
                onClick={() => bulkSave.mutate({ ids: selectedIds, patch: { owner_email: myEmail } })}
              >
                <UserCheck className="w-3 h-3 flex-shrink-0" /> {t('שייך אליי')}
              </Button>
            )}

            <Button
              variant="outline" size="sm"
              className="h-7 rounded-full text-xs gap-1 bg-card text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-3 h-3 flex-shrink-0" /> {t('מחיקה')}
            </Button>

            <Button
              variant="ghost" size="icon" className="h-7 w-7 ms-auto"
              onClick={() => setSelected(new Set())} aria-label={t('ביטול הבחירה')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <CardSkeleton count={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={records.length === 0 ? `${t('אין עדיין')} ${schema.title}` : t('לא נמצאו תוצאות')}
            description={records.length === 0 ? t('צור רשומה ראשונה כדי להתחיל.') : t('נסה לשנות את החיפוש, את הסינון או את הפלח.')}
            action={records.length === 0 ? (
              <Button onClick={openNew} className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> {schema.singular}</Button>
            ) : null}
          />
        ) : view === 'board' && board ? (
          <BoardView
            schema={{ ...schema, boardField: board.field, boardStages: board.stages }}
            records={visible}
            openRecord={openRecord}
            subtitleOf={(r) => {
              const field = columns.find((f) => f.key !== schema.titleField && f.type !== 'select');
              return field ? formatValue(field, readField(field, r), lookups) : '';
            }}
            amountOf={moneyField ? (r) => readField(moneyField, r) : undefined}
            formatValue={currency}
          />
        ) : (
          <>
            {/* Desktop: table, optionally grouped with a subtotal per group */}
            <div className="hidden md:block space-y-4">
              {grouped ? grouped.map((group) => (
                <div key={group.label} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold truncate">{group.label}</p>
                    <p className="text-[11px] text-muted-foreground flex-shrink-0">
                      {group.items.length}
                      {groupTotal(group.items) > 0 && <> · <span dir="ltr">{currency(groupTotal(group.items))}</span></>}
                    </p>
                  </div>
                  {table(group.items)}
                </div>
              )) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">{table(paged)}</div>
              )}
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden space-y-2">
              {(groupKey ? visible : paged).map((record) => {
                const late = isOverdue(schema, record);
                return (
                  <div
                    key={record.id}
                    className={`flex items-start gap-2 border rounded-xl p-3.5 transition-colors ${
                      selected.has(record.id) ? 'border-primary/40 bg-accent' : 'border-border bg-card'
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(record.id)}
                      onCheckedChange={() => toggleRow(record.id)}
                      className="mt-0.5 flex-shrink-0"
                      aria-label={t('בחירת שורה')}
                    />
                    <button onClick={() => openRecord(record)} className="flex-1 min-w-0 text-start">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-bold truncate min-w-0 inline-flex items-center gap-1.5">
                          {late && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                          {record[schema.titleField] || '—'}
                        </p>
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
                  </div>
                );
              })}
            </div>

            {!groupKey && (
              <Pagination
                total={visible.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                className="mt-4"
              />
            )}

            <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
              <p className="text-[11px] text-muted-foreground">
                {visible.length} / {records.length}
                {hiddenCount > 0 && ` · ${hiddenCount} ${t('רשומות מוסתרות לפי הרשאות')}`}
              </p>
              {!groupKey && visible.length > PAGE_SIZES[0] && (
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-7 rounded-lg text-[11px] w-28"><SelectValue /></SelectTrigger>
                  <SelectContent dir={dir}>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>{size} {t('בעמוד')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </>
        )}
      </>)}

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

      <DuplicatesDialog
        open={duplicatesOpen}
        onOpenChange={setDuplicatesOpen}
        schema={schema}
        records={records}
        lookups={lookups}
        onMerge={mergeDuplicates}
        merging={save.isPending || bulkRemove.isPending}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('למחוק את הרשומה?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.[schema.titleField] || schema.singular} — {t('אפשר לבטל מיד אחרי המחיקה.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('ביטול')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { remove.mutate(pendingDelete.id); setPendingDelete(null); }}
            >
              {t('מחיקה')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{`${t('מחיקה')} — ${selectedIds.length}`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('רשומות שאין לך הרשאת מחיקה עליהן ידולגו. אפשר לבטל מיד אחרי המחיקה.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('ביטול')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { bulkRemove.mutate(selectedIds); setSelected(new Set()); setBulkDeleteOpen(false); }}
            >
              {t('מחיקה')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

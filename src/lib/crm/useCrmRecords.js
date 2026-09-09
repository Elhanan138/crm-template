import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { cleanEmail } from '@/lib/permissions';
import { toast } from 'sonner';
import { sortFields } from '@/lib/customFields';
import { useRecordViewer, visibleRecords, scopeOf } from '@/lib/crm/visibility';
import { HISTORY_ENTITY, historyEntryFor } from '@/lib/crm/recordTrail';

export const currency = (v) =>
  v === null || v === undefined || v === '' ? '—' : `₪${Number(v).toLocaleString()}`;

export const formatValue = (field, value, lookups = {}) => {
  if (value === null || value === undefined || value === '') return '—';
  switch (field.type) {
    case 'currency': return currency(value);
    case 'percent': return `${Number(value)}%`;
    case 'number': return Number(value).toLocaleString();
    case 'checkbox': return value ? 'כן' : 'לא';
    case 'select': return field.options?.find((o) => String(o.value) === String(value))?.label ?? String(value);
    case 'relation': return lookups[field.key]?.[value] ?? String(value);
    default: return String(value);
  }
};

/** Records plus everything the list and form need, for one CRM schema. */
export function useCrmRecords(schema) {
  const queryClient = useQueryClient();
  const { isRealAdmin, effectiveUser } = useAccessControl();
  const myEmail = cleanEmail(effectiveUser?.email);
  const entity = schema.entity;

  const viewer = useRecordViewer();

  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['crm', entity],
    queryFn: () => api.entities[entity].list(schema.defaultSort),
  });

  // The list never sees a row the viewer may not see. Filtering here rather
  // than in the page is what keeps the rule identical in the table, in the
  // related-records strip and in global search.
  const records = useMemo(
    () => visibleRecords(allRecords, schema, viewer),
    [allRecords, schema, viewer]
  );
  const hiddenCount = allRecords.length - records.length;

  // Related entities referenced by relation fields, fetched once each.
  const relationEntities = useMemo(
    () => [...new Set(schema.fields.filter((f) => f.type === 'relation').map((f) => f.entity))],
    [schema]
  );

  const relationQueries = useQuery({
    queryKey: ['crm-relations', ...relationEntities],
    queryFn: async () => {
      const out = {};
      for (const name of relationEntities) {
        try { out[name] = await api.entities[name].list(); } catch { out[name] = []; }
      }
      return out;
    },
    enabled: relationEntities.length > 0,
  });

  const relations = relationQueries.data || {};

  const lookups = useMemo(() => {
    const map = {};
    for (const field of schema.fields) {
      if (field.type !== 'relation') continue;
      map[field.key] = Object.fromEntries(
        (relations[field.entity] || []).map((r) => [r.id, r[field.labelField] || r.name || r.id])
      );
    }
    return map;
  }, [schema, relations]);

  const { data: allCustomFields = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => api.entities.CustomField.list(),
    staleTime: 60000,
  });
  const customFields = useMemo(
    () => sortFields(allCustomFields.filter((f) => f.entity === entity)),
    [allCustomFields, entity]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['crm', entity] });

  // Every save leaves a trail entry. It is written after the record, and a
  // failure to log is never allowed to fail the save — losing the history of an
  // edit is bad, losing the edit is worse.
  const logHistory = async (before, after) => {
    const entry = historyEntryFor({ schema, entity, before, after, actor: myEmail });
    if (!entry) return;
    try {
      await api.entities[HISTORY_ENTITY].create(entry);
      queryClient.invalidateQueries({ queryKey: ['record-trail', HISTORY_ENTITY, entity, entry.record_id] });
    } catch { /* the record is saved; the log is not worth an error toast */ }
  };

  const save = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const before = id ? allRecords.find((r) => r.id === id) : null;
      const saved = id
        ? await api.entities[entity].update(id, data)
        : await api.entities[entity].create({ ...data, owner_email: data.owner_email || myEmail });
      await logHistory(before, saved);
      return saved;
    },
    onSuccess: (_r, vars) => { invalidate(); toast.success(vars.id ? 'הרשומה עודכנה' : `נוצר ${schema.singular} חדש`); },
    onError: (e) => toast.error(e?.message || 'השמירה נכשלה'),
  });

  // A delete hands back what it removed, so the caller can offer to put it
  // back. The record keeps its id on restore, which is what makes every
  // id-based link to it survive the round trip.
  const restore = useMutation({
    mutationFn: (deleted) => api.entities[entity].bulkCreate(deleted),
    onSuccess: (rows) => { invalidate(); toast.success(`${rows.length} רשומות שוחזרו`); },
    onError: (e) => toast.error(e?.message || 'השחזור נכשל'),
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const deleted = allRecords.find((r) => r.id === id);
      await api.entities[entity].delete(id);
      return deleted ? [deleted] : [];
    },
    onSuccess: (deleted) => {
      invalidate();
      toast.success('הרשומה נמחקה', deleted.length ? {
        action: { label: 'ביטול', onClick: () => restore.mutate(deleted) },
      } : undefined);
    },
    onError: (e) => toast.error(e?.message || 'המחיקה נכשלה'),
  });

  // Bulk edits act only on records the viewer may edit. Silently skipping the
  // rest would be worse than refusing: the count in the toast is what tells you
  // the difference between "done" and "done to some of them".
  const bulkSave = useMutation({
    mutationFn: async ({ ids, patch }) => {
      const editable = records.filter((r) => ids.includes(r.id) && canEdit(r));
      await api.entities[entity].bulkUpdate(editable.map((r) => ({ id: r.id, ...patch })));
      return { changed: editable.length, skipped: ids.length - editable.length };
    },
    onSuccess: ({ changed, skipped }) => {
      invalidate();
      toast.success(skipped ? `${changed} רשומות עודכנו · ${skipped} דולגו (אין הרשאה)` : `${changed} רשומות עודכנו`);
    },
    onError: (e) => toast.error(e?.message || 'העדכון נכשל'),
  });

  const bulkRemove = useMutation({
    mutationFn: async (ids) => {
      const deletable = records.filter((r) => ids.includes(r.id) && canDelete(r));
      await api.entities[entity].deleteMany(deletable.map((r) => r.id));
      return { rows: deletable, deleted: deletable.length, skipped: ids.length - deletable.length };
    },
    onSuccess: ({ rows, deleted, skipped }) => {
      invalidate();
      // Fifty rows removed in one click is exactly where an undo has to exist.
      toast.success(
        skipped ? `${deleted} נמחקו · ${skipped} דולגו (אין הרשאה)` : `${deleted} רשומות נמחקו`,
        rows.length ? { duration: 10000, action: { label: 'ביטול', onClick: () => restore.mutate(rows) } } : undefined
      );
    },
    onError: (e) => toast.error(e?.message || 'המחיקה נכשלה'),
  });

  // Binary model, same as the rest of the system: admin, or the record owner.
  const canEdit = (record) => isRealAdmin || !record?.id || cleanEmail(record.owner_email) === myEmail;
  const canDelete = (record) => isRealAdmin || cleanEmail(record?.owner_email) === myEmail;

  return {
    records, isLoading, relations, lookups, customFields,
    save, remove, bulkSave, bulkRemove, restore, canEdit, canDelete, isRealAdmin, myEmail,
    allRecords,
    viewer, hiddenCount, scope: scopeOf(schema),
  };
}

/** Search + filter, shared by every CRM list. */
export function filterRecords(records, schema, { search, filters }) {
  const q = search.trim().toLowerCase();
  // Long-form fields and the values of custom fields are searched too: a phrase
  // typed into a note or into a field an administrator generated is exactly the
  // kind of thing someone later searches for and could not find.
  const keys = [
    ...new Set([
      ...(schema.searchFields || []),
      ...(schema.fields || []).filter((f) => f.type === 'textarea').map((f) => f.key),
    ]),
  ];
  return records.filter((r) => {
    for (const [key, value] of Object.entries(filters || {})) {
      if (value === 'all' || value === undefined) continue;
      const actual = key.startsWith('custom_fields.')
        ? r.custom_fields?.[key.slice('custom_fields.'.length)]
        : r[key];
      if (String(actual) !== String(value)) return false;
    }
    if (!q) return true;
    if (keys.some((f) => String(r[f] || '').toLowerCase().includes(q))) return true;
    return Object.values(r.custom_fields || {}).some((v) => String(v ?? '').toLowerCase().includes(q));
  });
}

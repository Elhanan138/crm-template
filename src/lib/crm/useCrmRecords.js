import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { cleanEmail } from '@/lib/permissions';
import { toast } from 'sonner';
import { sortFields } from '@/lib/customFields';
import { useRecordViewer, visibleRecords, scopeOf } from '@/lib/crm/visibility';

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

  const save = useMutation({
    mutationFn: ({ id, ...data }) =>
      id ? api.entities[entity].update(id, data) : api.entities[entity].create({ ...data, owner_email: data.owner_email || myEmail }),
    onSuccess: (_r, vars) => { invalidate(); toast.success(vars.id ? 'הרשומה עודכנה' : `נוצר ${schema.singular} חדש`); },
    onError: (e) => toast.error(e?.message || 'השמירה נכשלה'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.entities[entity].delete(id),
    onSuccess: () => { invalidate(); toast.success('הרשומה נמחקה'); },
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
      return { deleted: deletable.length, skipped: ids.length - deletable.length };
    },
    onSuccess: ({ deleted, skipped }) => {
      invalidate();
      toast.success(skipped ? `${deleted} נמחקו · ${skipped} דולגו (אין הרשאה)` : `${deleted} רשומות נמחקו`);
    },
    onError: (e) => toast.error(e?.message || 'המחיקה נכשלה'),
  });

  // Binary model, same as the rest of the system: admin, or the record owner.
  const canEdit = (record) => isRealAdmin || !record?.id || cleanEmail(record.owner_email) === myEmail;
  const canDelete = (record) => isRealAdmin || cleanEmail(record?.owner_email) === myEmail;

  return {
    records, isLoading, relations, lookups, customFields,
    save, remove, bulkSave, bulkRemove, canEdit, canDelete, isRealAdmin, myEmail,
    viewer, hiddenCount, scope: scopeOf(schema),
  };
}

/** Search + filter, shared by every CRM list. */
export function filterRecords(records, schema, { search, filters }) {
  const q = search.trim().toLowerCase();
  return records.filter((r) => {
    for (const [key, value] of Object.entries(filters || {})) {
      if (value === 'all' || value === undefined) continue;
      if (String(r[key]) !== String(value)) return false;
    }
    if (!q) return true;
    return (schema.searchFields || []).some((f) => String(r[f] || '').toLowerCase().includes(q));
  });
}

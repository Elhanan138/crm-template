import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import { sortFields } from '@/lib/customFields';

/**
 * Drop-in block that renders the admin-defined fields for one entity.
 * Every form that supports custom fields uses this, so a field created in
 * הגדרות → אדמין → שדות מותאמים shows up without touching the form again.
 */
export default function EntityCustomFields({ entity, values, onChange, columns = 2, title = 'שדות נוספים' }) {
  const { data: all = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => api.entities.CustomField.list(),
    staleTime: 60000,
  });

  const fields = sortFields(all.filter((f) => f.entity === entity));
  if (fields.length === 0) return null;

  return (
    <div className="space-y-2 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <CustomFieldsRenderer fields={fields} values={values || {}} onChange={onChange} columns={columns} />
    </div>
  );
}

/** The hook behind it, for forms that need to validate before saving. */
export function useEntityCustomFields(entity) {
  const { data: all = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => api.entities.CustomField.list(),
    staleTime: 60000,
  });
  return sortFields(all.filter((f) => f.entity === entity));
}

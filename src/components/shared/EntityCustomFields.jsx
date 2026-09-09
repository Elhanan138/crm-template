import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import CustomFieldsRenderer from '@/components/shared/CustomFieldsRenderer';
import { sortFields, layoutSlots, formFieldsOf, LAYOUT_END } from '@/lib/customFields';
import { useI18n } from '@/lib/i18n';

/**
 * The admin-defined fields for one entity, rendered where they were placed.
 *
 * Called with an `anchor`, it renders only the fields dropped after that point
 * in the form — so a form places one of these at each of its own positions, and
 * a field dragged in הגדרות → שדות מותאמים lands where the administrator put it.
 *
 * Called without one, it keeps its original behaviour: the block at the foot of
 * the form, holding everything that was never given a position. That is why a
 * form which has not been taught about anchors still shows every field.
 */
export default function EntityCustomFields({
  entity, values, onChange, columns = 2, title, anchor = LAYOUT_END,
}) {
  const { t } = useI18n();
  const fields = useEntityCustomFields(entity);
  const slot = layoutSlots(formFieldsOf(entity), fields).find((s) => s.key === anchor);
  const placed = slot?.custom || [];
  if (placed.length === 0) return null;

  // Only the trailing block earns a heading; a field placed mid-form belongs to
  // the question above it, and a heading there would read as a new section.
  const showTitle = anchor === LAYOUT_END;

  return (
    <div className={showTitle ? 'space-y-2 pt-3 border-t border-border' : 'space-y-2'}>
      {showTitle && (
        <p className="text-xs font-semibold text-muted-foreground">{title || t('שדות נוספים')}</p>
      )}
      <CustomFieldsRenderer fields={placed} values={values || {}} onChange={onChange} columns={columns} />
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

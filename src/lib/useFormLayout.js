import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { LAYOUT_ENTITY, resolveLayout, orderFor } from '@/lib/formLayout';

/**
 * The order a form should render in, resolved for one entity.
 *
 * Every form asks this rather than deciding for itself, which is what keeps the
 * preview in הגדרות → שדות מותאמים and the real form in step: they are reading
 * the same answer.
 *
 * A deployment that has never reordered anything gets the natural order — the
 * schema as written, then the custom fields — so a form that nobody has touched
 * looks exactly as it always did.
 */
export function useFormLayout(entity, customFields = []) {
  const { data: layouts = [] } = useQuery({
    queryKey: ['form-layouts'],
    queryFn: () => api.entities[LAYOUT_ENTITY].list(),
    staleTime: 60_000,
  });
  return resolveLayout(entity, customFields, orderFor(layouts, entity));
}

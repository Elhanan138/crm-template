import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { sortFields } from '@/lib/customFields';

/**
 * The admin-defined fields for one entity.
 *
 * Every form asks for these and then renders them in the order `useFormLayout`
 * gives, so there is one answer to "which extra fields does this record have"
 * and one answer to "in what order" — never a form deciding either for itself.
 */
export function useEntityCustomFields(entity) {
  const { data: all = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => api.entities.CustomField.list(),
    staleTime: 60_000,
  });
  return sortFields(all.filter((f) => f.entity === entity));
}

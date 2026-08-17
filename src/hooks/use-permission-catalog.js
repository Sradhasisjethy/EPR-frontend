import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * The permission tree the role editor renders, served by the API rather than
 * duplicated here — a permission added on the backend appears in this form on
 * the next load, with no second list to keep in step.
 *
 * Returns `{ modules, grantable }`: `grantable` is the subset the signed-in user
 * is allowed to hand out, which the form uses to disable the rest up front
 * instead of letting the save fail.
 */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: async () => (await apiClient.get('/roles/permission-catalog')).data.data,
    // The catalog only changes on deploy, so don't refetch it mid-session.
    staleTime: Infinity,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Tenant settings are a generic key/JSONB store, so these are deliberately thin
 * — the shape of any one setting is the caller's business.
 */
export function useSettings(category) {
  return useQuery({
    queryKey: ['settings', category || 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/settings', { params: category ? { category } : {} });
      return res.data.data;
    },
  });
}

export function useUpsertSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, category }) => {
      const res = await apiClient.put(`/settings/${key}`, { value, category });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

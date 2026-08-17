import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useImportTemplates() {
  return useQuery({
    queryKey: ['migration', 'templates'],
    queryFn: async () => (await apiClient.get('/migration/templates')).data.data,
  });
}

export function useRunImport() {
  return useMutation({
    // A rejected import returns 422 with per-row errors, which is a normal
    // outcome here rather than an exception — surface the body either way.
    mutationFn: async ({ kind, rows, dryRun }) => {
      try {
        return (await apiClient.post('/migration/import', { kind, rows, dryRun })).data.data;
      } catch (error) {
        if (error.response?.status === 422) return error.response.data.data;
        throw error;
      }
    },
  });
}

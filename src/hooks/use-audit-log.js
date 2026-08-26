import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const response = await apiClient.get('/audit-logs', { params });
      return response.data.data;
    },
    placeholderData: (prev) => prev,
  });
}

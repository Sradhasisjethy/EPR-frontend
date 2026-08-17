import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDashboardStats(factoryId) {
  return useQuery({
    queryKey: ['dashboardStats', factoryId || 'all'],
    queryFn: async () =>
      (await apiClient.get('/dashboard/stats', { params: factoryId ? { factoryId } : {} })).data.data,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });
}

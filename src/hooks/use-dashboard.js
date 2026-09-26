import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDashboardStats(factoryId) {
  return useQuery({
    queryKey: ['dashboardStats', factoryId || 'all'],
    queryFn: async () =>
      (await apiClient.get('/dashboard/stats', { params: factoryId ? { factoryId } : {} })).data.data,
    // Every open dashboard re-asks on this interval, and the answer is 65 SQL
    // queries (cached server-side for 45 s now). The figures are daily and
    // monthly totals; ninety seconds is well inside what "live" means for them
    // and cuts the standing load of the page by two thirds.
    refetchInterval: 90000,
  });
}

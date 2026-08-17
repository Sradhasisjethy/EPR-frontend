import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useStockAgeing(factoryId, params = {}) {
  return useQuery({
    queryKey: ['analytics', 'stock-ageing', factoryId, params],
    queryFn: async () => (await apiClient.get('/analytics/stock-ageing', { params: { factoryId, ...params } })).data.data,
    enabled: !!factoryId,
  });
}

export function useDashboardKpis(factoryId, params = {}) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', factoryId, params],
    queryFn: async () => (await apiClient.get('/analytics/dashboard', { params: { factoryId, ...params } })).data.data,
    enabled: !!factoryId,
  });
}

export function useCostingReport(factoryId) {
  return useQuery({
    queryKey: ['analytics', 'costing', factoryId],
    queryFn: async () => (await apiClient.get('/analytics/costing', { params: { factoryId } })).data.data,
    enabled: !!factoryId,
  });
}

export function useAlerts(factoryId) {
  return useQuery({
    queryKey: ['analytics', 'alerts', factoryId],
    queryFn: async () => (await apiClient.get('/analytics/alerts', { params: { factoryId } })).data.data,
    enabled: !!factoryId,
  });
}

export function useCancellationAnalytics(factoryId, params = {}) {
  return useQuery({
    queryKey: ['analytics', 'cancellations', factoryId, params],
    queryFn: async () => (await apiClient.get('/analytics/cancellations', { params: { factoryId, ...params } })).data.data,
    enabled: !!factoryId,
  });
}

export function useDocumentSearch(q, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['analytics', 'search', q],
    queryFn: async () => (await apiClient.get('/analytics/search', { params: { q } })).data.data,
    enabled: enabled && !!q && q.trim().length >= 2,
  });
}

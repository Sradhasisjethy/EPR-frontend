import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useStockLots(params = {}) {
  return useQuery({
    queryKey: ['stock-lots', params],
    queryFn: async () => (await apiClient.get('/inventory/lots', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useStockLedger(params = {}) {
  return useQuery({
    queryKey: ['stock-ledger', params],
    queryFn: async () => (await apiClient.get('/inventory/ledger', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useStockBalance(factoryId, productId) {
  return useQuery({
    queryKey: ['stock-balance', factoryId, productId],
    queryFn: async () => (await apiClient.get('/inventory/balance', { params: { factoryId, productId } })).data.data,
    enabled: !!factoryId && !!productId,
  });
}

export function useReleaseLotEarly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lotId, reason }) => (await apiClient.put(`/inventory/lots/${lotId}/release-early`, { reason })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] });
    },
  });
}

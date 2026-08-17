import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useSalesOrders(params = {}) {
  return useQuery({
    queryKey: ['sales-orders', params],
    queryFn: async () => (await apiClient.get('/sales/orders', { params })).data.data,
    keepPreviousData: true,
  });
}
export function useSalesOrder(id) {
  return useQuery({
    queryKey: ['sales-orders', 'detail', id],
    queryFn: async () => (await apiClient.get(`/sales/orders/${id}`)).data.data,
    enabled: !!id,
  });
}
export function useAvailableToPromise(factoryId, productId) {
  return useQuery({
    queryKey: ['sales-atp', factoryId, productId],
    queryFn: async () => (await apiClient.get('/sales/atp', { params: { factoryId, productId } })).data.data,
    enabled: !!factoryId && !!productId,
  });
}

const invalidateOrders = (qc) => {
  qc.invalidateQueries({ queryKey: ['sales-orders'] });
  qc.invalidateQueries({ queryKey: ['sales-atp'] });
};

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/sales/orders', data)).data.data,
    onSuccess: () => invalidateOrders(qc),
  });
}
export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.put(`/sales/orders/${id}/confirm`)).data.data,
    onSuccess: () => invalidateOrders(qc),
  });
}
export function useCancelSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/sales/orders/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidateOrders(qc),
  });
}
export function useShortCloseSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/sales/orders/${id}/short-close`, { reason })).data.data,
    onSuccess: () => invalidateOrders(qc),
  });
}

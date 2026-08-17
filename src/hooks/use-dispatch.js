import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDeliveryChallans(params = {}) {
  return useQuery({
    queryKey: ['delivery-challans', params],
    queryFn: async () => (await apiClient.get('/dispatch/challans', { params })).data.data,
    keepPreviousData: true,
  });
}

const invalidate = (qc) => {
  qc.invalidateQueries({ queryKey: ['delivery-challans'] });
  qc.invalidateQueries({ queryKey: ['sales-orders'] });
  qc.invalidateQueries({ queryKey: ['stock-lots'] });
  qc.invalidateQueries({ queryKey: ['stock-ledger'] });
  qc.invalidateQueries({ queryKey: ['stock-balance'] });
};

export function useCreateChallan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/dispatch/challans', data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export function useCancelChallan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/dispatch/challans/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export const getChallanPrintUrl = (id, format = 'a4') => {
  const base = apiClient.defaults.baseURL || '/api/v1';
  return `${base}/dispatch/challans/${id}/print?format=${format}`;
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';

export function useTransfers(params = {}) {
  return useQuery({
    queryKey: ['transfers', params],
    queryFn: async () => (await apiClient.get('/transfers', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['transfers'], '/transfers');

export function useTransfer(id) {
  return useQuery({
    queryKey: ['transfers', 'detail', id],
    queryFn: async () => (await apiClient.get(`/transfers/${id}`)).data.data,
    enabled: !!id,
  });
}

const invalidateAll = (qc) => {
  qc.invalidateQueries({ queryKey: ['transfers'] });
  qc.invalidateQueries({ queryKey: ['stock-lots'] });
  qc.invalidateQueries({ queryKey: ['stock-ledger'] });
  qc.invalidateQueries({ queryKey: ['stock-balance'] });
};

export function useInitiateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/transfers', data)).data.data,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useReceiveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/transfers/${id}/receive`, data)).data.data,
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCancelTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/transfers/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidateAll(qc),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';

export function useCheques(params = {}) {
  return useQuery({
    queryKey: ['cheques', params],
    queryFn: async () => (await apiClient.get('/cheques', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['cheques'], '/cheques');

// A bounce reverses the underlying receipt/payment and posts bank charges, so
// the ledger and the parent document are invalidated alongside the cheque.
const invalidate = (qc) => {
  qc.invalidateQueries({ queryKey: ['cheques'] });
  qc.invalidateQueries({ queryKey: ['receipts'] });
  qc.invalidateQueries({ queryKey: ['payments'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
};

export function usePresentCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => (await apiClient.put(`/cheques/${id}/present`, body)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export function useClearCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => (await apiClient.put(`/cheques/${id}/clear`, body)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export function useBounceCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }) => (await apiClient.put(`/cheques/${id}/bounce`, body)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export function useCancelCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/cheques/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidate(qc),
  });
}

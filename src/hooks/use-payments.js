import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const invalidate = (qc) => {
  qc.invalidateQueries({ queryKey: ['receipts'] });
  qc.invalidateQueries({ queryKey: ['payments'] });
  qc.invalidateQueries({ queryKey: ['sales-invoices'] });
  qc.invalidateQueries({ queryKey: ['purchase-invoices'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
};

// Receipts (from customers)
export function useReceipts(params = {}) {
  return useQuery({ queryKey: ['receipts', params], queryFn: async () => (await apiClient.get('/receipts', { params })).data.data, keepPreviousData: true });
}
export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/receipts', data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}
export function useCancelReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/receipts/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidate(qc),
  });
}

// Payments (to vendors/contractors)
export function usePayments(params = {}) {
  return useQuery({ queryKey: ['payments', params], queryFn: async () => (await apiClient.get('/payments', { params })).data.data, keepPreviousData: true });
}
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/payments', data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}
export function useCancelPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/payments/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidate(qc),
  });
}

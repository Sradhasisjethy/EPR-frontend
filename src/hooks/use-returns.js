import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const invalidateStock = (qc) => {
  qc.invalidateQueries({ queryKey: ['stock-lots'] });
  qc.invalidateQueries({ queryKey: ['stock-ledger'] });
  qc.invalidateQueries({ queryKey: ['stock-balance'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
};

// Sales Returns
export function useSalesReturns(params = {}) {
  return useQuery({ queryKey: ['sales-returns', params], queryFn: async () => (await apiClient.get('/returns/sales-returns', { params })).data.data, keepPreviousData: true });
}
export function useCreateSalesReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/returns/sales-returns', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-returns'] }); invalidateStock(qc); },
  });
}
export function useCancelSalesReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/returns/sales-returns/${id}/cancel`, { reason })).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-returns'] }); invalidateStock(qc); },
  });
}

// Purchase Returns
export function usePurchaseReturns(params = {}) {
  return useQuery({ queryKey: ['purchase-returns', params], queryFn: async () => (await apiClient.get('/returns/purchase-returns', { params })).data.data, keepPreviousData: true });
}
export function useCreatePurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/returns/purchase-returns', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-returns'] }); invalidateStock(qc); },
  });
}
export function useCancelPurchaseReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/returns/purchase-returns/${id}/cancel`, { reason })).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-returns'] }); invalidateStock(qc); },
  });
}

// Credit Notes
export function useCreditNotes(params = {}) {
  return useQuery({ queryKey: ['credit-notes', params], queryFn: async () => (await apiClient.get('/returns/credit-notes', { params })).data.data, keepPreviousData: true });
}
export function useCreateCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/returns/credit-notes', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-notes'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}
export function useCancelCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/returns/credit-notes/${id}/cancel`, { reason })).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['credit-notes'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}

// Debit Notes
export function useDebitNotes(params = {}) {
  return useQuery({ queryKey: ['debit-notes', params], queryFn: async () => (await apiClient.get('/returns/debit-notes', { params })).data.data, keepPreviousData: true });
}
export function useCreateDebitNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/returns/debit-notes', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debit-notes'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}
export function useCancelDebitNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/returns/debit-notes/${id}/cancel`, { reason })).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debit-notes'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}

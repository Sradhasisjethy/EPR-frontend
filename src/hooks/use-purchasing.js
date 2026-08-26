import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Purchase Orders
export function usePurchaseOrders(params = {}) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: async () => (await apiClient.get('/purchasing/orders', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: ['purchase-orders', 'detail', id],
    queryFn: async () => (await apiClient.get(`/purchasing/orders/${id}`)).data.data,
    enabled: !!id,
  });
}
export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/purchasing/orders', data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}
export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/purchasing/orders/${id}`, data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}
export function useConfirmPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.put(`/purchasing/orders/${id}/confirm`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}
export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/purchasing/orders/${id}/cancel`, { reason })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

// Goods Receipts
export function useGoodsReceipts(params = {}) {
  return useQuery({
    queryKey: ['goods-receipts', params],
    queryFn: async () => (await apiClient.get('/purchasing/receipts', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/purchasing/receipts', data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goods-receipts'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['stock-lots'] });
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      qc.invalidateQueries({ queryKey: ['stock-balance'] });
    },
  });
}

// Purchase Invoices
export function usePurchaseInvoices(params = {}) {
  return useQuery({
    queryKey: ['purchase-invoices', params],
    queryFn: async () => (await apiClient.get('/purchasing/invoices', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/purchasing/invoices', data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-invoices'] }),
  });
}
/**
 * Reverses a posted goods receipt, taking its stock back out.
 * There is deliberately no hook for setting an invoice's payment status: it is
 * derived from allocations server-side, and the endpoint that used to accept it
 * let an unpaid bill be marked PAID with no payment behind it.
 */
export function useCancelGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/purchasing/receipts/${id}/cancel`, { reason })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goods-receipts'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useCancelPurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/purchasing/invoices/${id}/cancel`, { reason })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-invoices'] }),
  });
}

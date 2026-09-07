import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { openApiDocument } from '@/lib/api-document';

export function useSalesInvoices(params = {}) {
  return useQuery({
    queryKey: ['sales-invoices', params],
    queryFn: async () => (await apiClient.get('/invoices', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useSalesInvoice(id) {
  return useQuery({
    queryKey: ['sales-invoices', 'detail', id],
    queryFn: async () => (await apiClient.get(`/invoices/${id}`)).data.data,
    enabled: !!id,
  });
}

const invalidate = (qc) => {
  qc.invalidateQueries({ queryKey: ['sales-invoices'] });
  qc.invalidateQueries({ queryKey: ['delivery-challans'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
};

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/invoices', data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/invoices/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidate(qc),
  });
}

/**
 * Fetched rather than linked, for the same reason as the challan print: the API
 * sits on another origin and a browser sends no cookie with a cross-origin link
 * navigation, so a plain <a href> arrived unauthenticated.
 */
export const openInvoicePrint = (id) => openApiDocument(`/invoices/${id}/print`);

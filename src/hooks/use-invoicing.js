import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useSalesInvoices(params = {}) {
  return useQuery({
    queryKey: ['sales-invoices', params],
    queryFn: async () => (await apiClient.get('/invoices', { params })).data.data,
    keepPreviousData: true,
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

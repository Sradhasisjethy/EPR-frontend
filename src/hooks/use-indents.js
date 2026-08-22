import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useIndents(params = {}) {
  return useQuery({
    queryKey: ['purchase-indents', params],
    queryFn: async () => (await apiClient.get('/purchasing/indents', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useThreeWayMatch(purchaseInvoiceId) {
  return useQuery({
    queryKey: ['three-way-match', purchaseInvoiceId],
    queryFn: async () => (await apiClient.get(`/purchasing/invoices/${purchaseInvoiceId}/three-way-match`)).data.data,
    enabled: !!purchaseInvoiceId,
  });
}

const invalidate = (qc) => {
  qc.invalidateQueries({ queryKey: ['purchase-indents'] });
  qc.invalidateQueries({ queryKey: ['purchase-orders'] });
};

export function useCreateIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/purchasing/indents', data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}
export function useApproveIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.put(`/purchasing/indents/${id}/approve`)).data.data,
    onSuccess: () => invalidate(qc),
  });
}
export function useRejectIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/purchasing/indents/${id}/reject`, { reason })).data.data,
    onSuccess: () => invalidate(qc),
  });
}
export function useConvertIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.post(`/purchasing/indents/${id}/convert`, data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

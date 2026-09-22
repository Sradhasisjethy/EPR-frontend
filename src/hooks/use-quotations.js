import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useQuotations(params = {}) {
  return useQuery({
    queryKey: ['quotations', params],
    queryFn: async () => (await apiClient.get('/quotations', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useQuotation(id) {
  return useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => (await apiClient.get(`/quotations/${id}`)).data.data,
    enabled: !!id,
  });
}

const refresh = (qc) => {
  qc.invalidateQueries({ queryKey: ['quotations'] });
  qc.invalidateQueries({ queryKey: ['quotation'] });
};

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/quotations', data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useUpdateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/quotations/${id}`, data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useSetQuotationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }) => (await apiClient.put(`/quotations/${id}/status`, { status, reason })).data.data,
    onSuccess: () => refresh(qc),
  });
}

/** Converting raises a sales order, so the order lists change too. */
export function useConvertQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.post(`/quotations/${id}/convert`, data)).data.data,
    onSuccess: () => {
      refresh(qc);
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

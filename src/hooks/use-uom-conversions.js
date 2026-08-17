import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useUomConversions(params = {}) {
  return useQuery({
    queryKey: ['uom-conversions', params],
    queryFn: async () => (await apiClient.get('/uom-conversions', { params })).data.data,
    keepPreviousData: true,
  });
}

const invalidate = (qc) => qc.invalidateQueries({ queryKey: ['uom-conversions'] });

export function useCreateUomConversion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/uom-conversions', data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}
export function useUpdateUomConversion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/uom-conversions/${id}`, data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}
export function useDeleteUomConversion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { await apiClient.delete(`/uom-conversions/${id}`); },
    onSuccess: () => invalidate(qc),
  });
}

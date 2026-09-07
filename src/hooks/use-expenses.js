import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useExpenses(params = {}) {
  return useQuery({ queryKey: ['expenses', params], queryFn: async () => (await apiClient.get('/expenses', { params })).data.data, placeholderData: (prev) => prev });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/expenses', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}

export function useCancelExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/expenses/${id}/cancel`, { reason })).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}

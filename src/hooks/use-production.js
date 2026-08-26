import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Plans
export function useProductionPlans(params = {}) {
  return useQuery({
    queryKey: ['production-plans', params],
    queryFn: async () => (await apiClient.get('/production/plans', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
export function useGenerateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/production/plans/generate', data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['production-plans'] }),
  });
}
export function useConfirmPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lines }) => (await apiClient.put(`/production/plans/${id}/confirm`, { lines })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['production-plans'] }),
  });
}

// Entries
export function useProductionEntries(params = {}) {
  return useQuery({
    queryKey: ['production-entries', params],
    queryFn: async () => (await apiClient.get('/production/entries', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
export function useCreateProductionEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/production/entries', data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-entries'] });
      qc.invalidateQueries({ queryKey: ['production-plans'] });
      qc.invalidateQueries({ queryKey: ['stock-lots'] });
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      qc.invalidateQueries({ queryKey: ['stock-balance'] });
      qc.invalidateQueries({ queryKey: ['production-pending-approvals'] });
    },
  });
}

// Variance approval
export function usePendingApprovals(params = {}) {
  return useQuery({
    queryKey: ['production-pending-approvals', params],
    queryFn: async () => (await apiClient.get('/production/pending-approvals', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
export function useApproveVariance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.put(`/production/consumptions/${id}/approve`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['production-pending-approvals'] }),
  });
}

// Wastage
export function useWastageRecords(params = {}) {
  return useQuery({
    queryKey: ['wastage-records', params],
    queryFn: async () => (await apiClient.get('/production/wastage', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
export function useCreateWastage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/production/wastage', data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wastage-records'] });
      qc.invalidateQueries({ queryKey: ['stock-lots'] });
      qc.invalidateQueries({ queryKey: ['stock-ledger'] });
      qc.invalidateQueries({ queryKey: ['stock-balance'] });
    },
  });
}

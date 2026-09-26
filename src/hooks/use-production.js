import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';
import { openApiDocument } from '@/lib/api-document';

// Plans
export function useProductionPlans(params = {}) {
  return useQuery({
    queryKey: ['production-plans', params],
    queryFn: async () => (await apiClient.get('/production/plans', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['production-plans'], '/production/plans');
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
registerListPrefetch(['production-entries'], '/production/entries');
/**
 * Everything a casting run touches.
 *
 * Listed once because the keys are not all in one namespace: the Orders and
 * Consumption tabs cache under ['production', ...] while entries and plans use
 * their own roots. Invalidating only the latter is why posting an entry moved
 * stock and left the screen showing the old figures — the run had happened, and
 * nothing on the page knew.
 */
const invalidateAfterProduction = (qc) => {
  for (const key of [
    ['production-entries'],
    ['production-plans'],
    ['production-pending-approvals'],
    ['production'],          // covers 'orders' and 'consumptions'
    ['stock-lots'],
    ['stock-ledger'],
    ['stock-balance'],
    ['sales-atp'],           // availability changes the moment material is consumed
    ['dashboard'],
  ]) {
    qc.invalidateQueries({ queryKey: key });
  }
};

export function useCreateProductionEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/production/entries', data)).data.data,
    onSuccess: () => invalidateAfterProduction(qc),
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
registerListPrefetch(['production-pending-approvals'], '/production/pending-approvals');
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
registerListPrefetch(['wastage-records'], '/production/wastage');
export function useCreateWastage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/production/wastage', data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wastage-records'] });
      invalidateAfterProduction(qc);
    },
  });
}

/**
 * Production orders: confirmed plan lines with how much has actually been cast
 * against each. Not a separate document — see ProductionService.listOrders for
 * why adding a third entity between plan and entry would duplicate the concept.
 */
export function useProductionOrders(params = {}) {
  return useQuery({
    queryKey: ['production', 'orders', params],
    queryFn: async () => {
      const res = await apiClient.get('/production/orders', { params });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['production', 'orders'], '/production/orders');

/** Raw material actually consumed, across every run. */
export function useMaterialConsumptions(params = {}) {
  return useQuery({
    queryKey: ['production', 'consumptions', params],
    queryFn: async () => {
      const res = await apiClient.get('/production/consumptions', { params });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['production', 'consumptions'], '/production/consumptions');

/**
 * Opens the shop-floor job card for a confirmed plan in a new tab.
 *
 * Fetched rather than linked, for the same reason as the challan print: a
 * cross-origin link navigation carries no cookie.
 */
export function openProductionSheet(planId) {
  return openApiDocument(`/production/plans/${planId}/sheet`);
}

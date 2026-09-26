import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';

export function useFixedAssets(params = {}) {
  return useQuery({
    queryKey: ['fixed-assets', params],
    queryFn: async () => (await apiClient.get('/fixed-assets', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['fixed-assets'], '/fixed-assets');

export function useDepreciationRuns(params = {}) {
  return useQuery({
    queryKey: ['fixed-assets', 'runs', params],
    queryFn: async () => (await apiClient.get('/fixed-assets/depreciation/runs', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['fixed-assets', 'runs'], '/fixed-assets/depreciation/runs');

/** What a run would post. Only asked for once a factory and date are both chosen. */
export function useDepreciationPreview({ factoryId, upTo }) {
  return useQuery({
    queryKey: ['fixed-assets', 'preview', factoryId, upTo],
    queryFn: async () => (await apiClient.get('/fixed-assets/depreciation/preview', { params: { factoryId, upTo } })).data.data,
    enabled: !!factoryId && !!upTo,
    staleTime: 0,
  });
}

// Every change here posts to the ledger, so statements and balances refresh too.
const refresh = (qc) => {
  qc.invalidateQueries({ queryKey: ['fixed-assets'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
};

const mutation = (fn) => () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => refresh(qc) });
};

export const useCreateFixedAsset = mutation(async (data) => (await apiClient.post('/fixed-assets', data)).data.data);
export const useUpdateFixedAsset = mutation(async ({ id, ...data }) => (await apiClient.put(`/fixed-assets/${id}`, data)).data.data);
export const useDisposeFixedAsset = mutation(async ({ id, ...data }) => (await apiClient.put(`/fixed-assets/${id}/dispose`, data)).data.data);
export const useRunDepreciation = mutation(async (data) => (await apiClient.post('/fixed-assets/depreciation/runs', data)).data.data);
export const useCancelDepreciationRun = mutation(
  async ({ id, reason }) => (await apiClient.put(`/fixed-assets/depreciation/runs/${id}/cancel`, { reason })).data.data
);

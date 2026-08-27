import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { createResourceHooks } from '@/lib/create-resource-hooks';

export const {
  useList: useQualityInspections,
  useGet: useQualityInspection,
  useCreate: useCreateInspection,
} = createResourceHooks('quality', '/quality');

/**
 * Lots parked in QC_HOLD or QC_FAILED — the lab's work list, and the answer to
 * "we made 200, why can I only sell 40?".
 */
export function useHeldLots(params = {}) {
  return useQuery({
    queryKey: ['quality', 'held-lots', params],
    queryFn: async () => {
      const res = await apiClient.get('/quality/held-lots', { params });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}

/**
 * Records the verdict on a pending test.
 *
 * Invalidates inventory alongside quality because a PASS releases the lot and a
 * FAIL quarantines it — the stock screens are wrong the instant this returns.
 */
export function useRecordInspectionResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(`/quality/${id}/result`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality'] });
      queryClient.invalidateQueries({ queryKey: ['stock-lots'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

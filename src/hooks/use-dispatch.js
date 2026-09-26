import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';
import { openApiDocument } from '@/lib/api-document';

export function useDeliveryChallans(params = {}) {
  return useQuery({
    queryKey: ['delivery-challans', params],
    queryFn: async () => (await apiClient.get('/dispatch/challans', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['delivery-challans'], '/dispatch/challans');

const invalidate = (qc) => {
  qc.invalidateQueries({ queryKey: ['delivery-challans'] });
  qc.invalidateQueries({ queryKey: ['sales-orders'] });
  qc.invalidateQueries({ queryKey: ['stock-lots'] });
  qc.invalidateQueries({ queryKey: ['stock-ledger'] });
  qc.invalidateQueries({ queryKey: ['stock-balance'] });
};

export function useCreateChallan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/dispatch/challans', data)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export function useCancelChallan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/dispatch/challans/${id}/cancel`, { reason })).data.data,
    onSuccess: () => invalidate(qc),
  });
}

/**
 * Opens a challan PDF.
 *
 * Fetched rather than linked: the API sits on another origin, and a browser
 * does not send cookies with a link navigation across origins — the request
 * arrived unauthenticated and the API answered "Access token is missing".
 */
export const openChallanPrint = (id, format = 'a4') =>
  openApiDocument(`/dispatch/challans/${id}/print`, { params: { format } });

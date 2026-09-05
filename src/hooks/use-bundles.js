import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Product bundles. See ERP-backend/docs/specs/bundle-kitting.md.
 *
 * Every mutation carries an `Idempotency-Key`. A salesperson on a patchy site
 * connection taps "add", sees nothing happen, and taps again — without the key
 * that puts two printers and two sets of accessories on the order.
 *
 * Each command answers with the whole order, so the cache is refreshed from the
 * response rather than re-fetched: the accessory rows appear in the same paint
 * as the parent, instead of flickering in a moment later.
 */

const newKey = () =>
  (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const withKey = (key) => ({ headers: { 'Idempotency-Key': key || newKey() } });

/** Read-only: what this product would bring with it. Writes nothing. */
export function useBundlePreview(productId, { qty = 1, partyId, factoryId, onDate } = {}) {
  return useQuery({
    queryKey: ['bundle-preview', productId, qty, partyId, factoryId, onDate],
    queryFn: async () =>
      (await apiClient.get(`/products/${productId}/bundle-preview`, {
        params: { qty, partyId, factoryId, onDate },
      })).data.data,
    enabled: !!productId,
  });
}

export function useAvailableAccessories(orderId, parentLineId) {
  return useQuery({
    queryKey: ['bundle-accessories', orderId, parentLineId],
    queryFn: async () =>
      (await apiClient.get(`/sales/orders/${orderId}/lines/${parentLineId}/available-accessories`)).data.data,
    enabled: !!orderId && !!parentLineId,
  });
}

export function useOverrideHistory(orderId) {
  return useQuery({
    queryKey: ['bundle-override-history', orderId],
    queryFn: async () => (await apiClient.get(`/bundles/orders/${orderId}/override-history`)).data.data,
    enabled: !!orderId,
  });
}

export function useOverrideReasonCodes() {
  return useQuery({
    queryKey: ['bundle-reason-codes'],
    queryFn: async () => (await apiClient.get('/bundles/reason-codes')).data.data,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Shared cache handling for the command endpoints.
 *
 * The order in the response is authoritative, so it is written straight into
 * the detail cache. The accessory picker and the availability figures are
 * invalidated instead, because a command can change both.
 */
const useBundleCommand = (mutationFn) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (data?.order) {
        qc.setQueryData(['sales-orders', 'detail', data.order.id], data.order);
      }
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['sales-atp'] });
      qc.invalidateQueries({ queryKey: ['bundle-accessories', variables?.orderId] });
      qc.invalidateQueries({ queryKey: ['bundle-override-history', variables?.orderId] });
    },
  });
};

export function useAddOrderLine() {
  return useBundleCommand(async ({ orderId, idempotencyKey, ...body }) =>
    (await apiClient.post(`/sales/orders/${orderId}/lines`, body, withKey(idempotencyKey))).data.data
  );
}

export function useChangeLineQuantity() {
  return useBundleCommand(async ({ orderId, lineId, qty, idempotencyKey }) =>
    (await apiClient.patch(`/sales/orders/${orderId}/lines/${lineId}/quantity`, { qty }, withKey(idempotencyKey))).data.data
  );
}

export function useSuppressComponent() {
  return useBundleCommand(async ({ orderId, lineId, reasonCode, reasonNote, idempotencyKey }) =>
    (await apiClient.post(`/sales/orders/${orderId}/lines/${lineId}/suppress`, { reasonCode, reasonNote }, withKey(idempotencyKey))).data.data
  );
}

export function useRestoreComponent() {
  return useBundleCommand(async ({ orderId, parentLineId, componentProductId, idempotencyKey }) =>
    (await apiClient.post(`/sales/orders/${orderId}/lines/${parentLineId}/restore`, { componentProductId }, withKey(idempotencyKey))).data.data
  );
}

export function useAddAccessory() {
  return useBundleCommand(async ({ orderId, parentLineId, productId, qty, idempotencyKey }) =>
    (await apiClient.post(`/sales/orders/${orderId}/lines/${parentLineId}/components`, { productId, qty }, withKey(idempotencyKey))).data.data
  );
}

export function useResetLine() {
  return useBundleCommand(async ({ orderId, lineId, idempotencyKey }) =>
    (await apiClient.post(`/sales/orders/${orderId}/lines/${lineId}/reset`, {}, withKey(idempotencyKey))).data.data
  );
}

export function useDeleteOrderLine() {
  return useBundleCommand(async ({ orderId, lineId, idempotencyKey }) =>
    (await apiClient.delete(`/sales/orders/${orderId}/lines/${lineId}`, withKey(idempotencyKey))).data.data
  );
}

// ---- bundle rule master --------------------------------------------------

export function useBundleRules(params = {}) {
  return useQuery({
    queryKey: ['bundle-rules', params],
    queryFn: async () => (await apiClient.get('/bundles/rules', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

const invalidateRules = (qc) => {
  qc.invalidateQueries({ queryKey: ['bundle-rules'] });
  // Expansion and the preview both resolve rules, so a published change has to
  // clear them too or a salesperson keeps seeing the old bundle.
  qc.invalidateQueries({ queryKey: ['bundle-preview'] });
  qc.invalidateQueries({ queryKey: ['bundle-accessories'] });
};

export function useCreateBundleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/bundles/rules', data)).data.data,
    onSuccess: () => invalidateRules(qc),
  });
}

export function useUpdateBundleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/bundles/rules/${id}`, data)).data.data,
    onSuccess: () => invalidateRules(qc),
  });
}

export function usePublishBundleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, effectiveFrom }) =>
      (await apiClient.post(`/bundles/rules/${id}/publish`, { effectiveFrom })).data.data,
    onSuccess: () => invalidateRules(qc),
  });
}

export function useNewBundleRuleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.post(`/bundles/rules/${id}/new-version`, {})).data.data,
    onSuccess: () => invalidateRules(qc),
  });
}

export function useArchiveBundleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.delete(`/bundles/rules/${id}`)).data.data,
    onSuccess: () => invalidateRules(qc),
  });
}

export function useCreateReasonCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/bundles/reason-codes', data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundle-reason-codes'] }),
  });
}

export function useDeactivateReasonCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code) => (await apiClient.delete(`/bundles/reason-codes/${code}`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bundle-reason-codes'] }),
  });
}

export function useAttachRate(params) {
  return useQuery({
    queryKey: ['bundle-attach-rate', params],
    queryFn: async () => (await apiClient.get('/bundles/reports/attach-rate', { params })).data.data,
    enabled: !!params?.fromDate && !!params?.toDate,
  });
}

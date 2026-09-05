import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { createResourceHooks } from '@/lib/create-resource-hooks';

export const {
  useList: useUoms,
  useCreate: useCreateUom,
  useUpdate: useUpdateUom,
  useDelete: useDeleteUom,
} = createResourceHooks('uoms', '/uoms');

export const {
  useList: useProductCategories,
  useCreate: useCreateProductCategory,
  useUpdate: useUpdateProductCategory,
  useDelete: useDeleteProductCategory,
} = createResourceHooks('product-categories', '/product-categories');

export const {
  useList: useHsnCodes,
  useCreate: useCreateHsnCode,
  useUpdate: useUpdateHsnCode,
  useDelete: useDeleteHsnCode,
} = createResourceHooks('hsn-codes', '/hsn-codes');

export const {
  useList: useProducts,
  useGet: useProduct,
  useCreate: useCreateProduct,
  useUpdate: useUpdateProduct,
  useDelete: useDeleteProduct,
} = createResourceHooks('products', '/products');

export const {
  useList: useMixDesigns,
  useGet: useMixDesign,
  useCreate: useCreateMixDesign,
  useUpdate: useUpdateMixDesign,
  useDelete: useDeleteMixDesign,
} = createResourceHooks('mix-designs', '/mix-designs');

/**
 * Every product, paged through until the server runs out.
 *
 * The list endpoint caps `limit` at 100. A screen that needs the *whole*
 * catalogue — bulk-populating a price list, matching a CSV import — was
 * silently getting only the first hundred alphabetically, so anything later in
 * the alphabet was invisible with no error to explain it. Screens that just
 * need to pick one item should use ProductPicker instead, which searches
 * server-side rather than pulling everything down.
 */
export function useAllProducts(params = {}, options = {}) {
  return useQuery({
    queryKey: ['products', 'all', params],
    queryFn: async () => {
      const limit = 100;
      let page = 1;
      let rows = [];
      let count = 0;

      // Bounded so a server that never stops paging cannot hang the screen.
      for (let guard = 0; guard < 100; guard += 1) {
        const response = await apiClient.get('/products', { params: { ...params, page, limit } });
        const data = response.data.data;
        rows = rows.concat(data.rows || []);
        count = Number(data.count ?? rows.length);
        if (rows.length >= count || !(data.rows || []).length) break;
        page += 1;
      }

      return { rows, count };
    },
    ...options,
  });
}

/**
 * The mix design in force for a product on a given date.
 *
 * Production consumes the DATE-EFFECTIVE recipe, not whichever version happens
 * to be active today, so any screen that lets the user choose a production date
 * has to ask the same question the posting code asks. Picking the `isActive`
 * row instead silently disagrees the moment an entry is backdated past a recipe
 * change — the operator keys overrides against materials the server will not use.
 */
export function useResolvedMixDesign(productId, onDate) {
  return useQuery({
    queryKey: ['mix-designs', 'resolve', productId, onDate],
    queryFn: async () => {
      const res = await apiClient.get('/mix-designs/resolve', { params: { productId, onDate } });
      return res.data.data;
    },
    enabled: Boolean(productId && onDate),
    retry: false,
  });
}

// --- BOM version lifecycle (FR-M03-6..11) ---
const invalidateBoms = (queryClient) => queryClient.invalidateQueries({ queryKey: ['mix-designs'] });

export function useActivateMixDesign() {
  const queryClient = useQueryClient();
  return useMutation({
    // Activating supersedes the current version, so `effectiveFrom` says from
    // which date this recipe applies (FR-M03-8).
    mutationFn: async ({ id, effectiveFrom }) =>
      (await apiClient.put(`/mix-designs/${id}/activate`, { effectiveFrom })).data.data,
    onSuccess: () => invalidateBoms(queryClient),
  });
}

export function useCloneMixDesign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }) => (await apiClient.post(`/mix-designs/${id}/clone`, { name })).data.data,
    onSuccess: () => invalidateBoms(queryClient),
  });
}

export function useMixDesignCost(id) {
  return useQuery({
    queryKey: ['mix-designs', 'cost', id],
    queryFn: async () => (await apiClient.get(`/mix-designs/${id}/cost`)).data.data,
    enabled: !!id,
  });
}

export function useExplodeMixDesign(id, outputQty = 1) {
  return useQuery({
    queryKey: ['mix-designs', 'explode', id, outputQty],
    queryFn: async () => (await apiClient.get(`/mix-designs/${id}/explode`, { params: { outputQty } })).data.data,
    enabled: !!id,
  });
}

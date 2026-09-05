import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Generates the standard list/get/create/update/delete react-query hooks for a
 * REST resource, so new modules don't hand-duplicate the same five functions
 * that use-organization.js / use-roles.js previously repeated per resource.
 * Existing hooks (use-organization, use-roles, use-employees) are left as-is —
 * this is only used by modules introduced from Phase 1 onward.
 *
 * @param {string} key - react-query cache key / cache-invalidation root, e.g. 'factories'
 * @param {string} basePath - API path, e.g. '/factories'
 */
export function createResourceHooks(key, basePath) {
  const useList = (params = {}, options = {}) =>
    useQuery({
      queryKey: [key, 'list', params],
      queryFn: async () => {
        const response = await apiClient.get(basePath, { params });
        return response.data.data; // { rows, count } from Sequelize findAndCountAll
      },
      placeholderData: (prev) => prev,
      ...options,
    });

  const useGet = (id, options = {}) =>
    useQuery({
      queryKey: [key, 'detail', id],
      queryFn: async () => {
        const response = await apiClient.get(`${basePath}/${id}`);
        return response.data.data;
      },
      enabled: !!id && options.enabled !== false,
    });

  const useCreate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (data) => {
        const response = await apiClient.post(basePath, data);
        return response.data.data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
    });
  };

  const useUpdate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, ...data }) => {
        const response = await apiClient.put(`${basePath}/${id}`, data);
        return response.data.data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
    });
  };

  const useDelete = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id) => {
        await apiClient.delete(`${basePath}/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
    });
  };

  return { useList, useGet, useCreate, useUpdate, useDelete };
}

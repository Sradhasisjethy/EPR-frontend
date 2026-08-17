import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { createResourceHooks } from '@/lib/create-resource-hooks';

export const {
  useList: useFactories,
  useGet: useFactory,
  useCreate: useCreateFactory,
  useUpdate: useUpdateFactory,
  useDelete: useDeleteFactory,
} = createResourceHooks('factories', '/factories');

export const {
  useList: useFinancialYears,
  useCreate: useCreateFinancialYear,
} = createResourceHooks('financial-years', '/financial-years');

export function useCurrentFinancialYear() {
  return useQuery({
    queryKey: ['financial-years', 'current'],
    queryFn: async () => {
      const response = await apiClient.get('/financial-years/current');
      return response.data.data;
    },
    retry: false,
  });
}

export function useSetCurrentFinancialYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.put(`/financial-years/${id}/set-current`);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-years'] }),
  });
}

export function useFactoryUsers(factoryId) {
  return useQuery({
    queryKey: ['factories', factoryId, 'users'],
    queryFn: async () => {
      const response = await apiClient.get(`/factories/${factoryId}/users`);
      return response.data.data;
    },
    enabled: !!factoryId,
  });
}

export function useAssignFactoryUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ factoryId, userId }) => {
      const response = await apiClient.post(`/factories/${factoryId}/users`, { userId });
      return response.data.data;
    },
    onSuccess: (_data, { factoryId }) => queryClient.invalidateQueries({ queryKey: ['factories', factoryId, 'users'] }),
  });
}

export function useUnassignFactoryUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ factoryId, userId }) => {
      await apiClient.delete(`/factories/${factoryId}/users/${userId}`);
    },
    onSuccess: (_data, { factoryId }) => queryClient.invalidateQueries({ queryKey: ['factories', factoryId, 'users'] }),
  });
}

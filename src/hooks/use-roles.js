import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useRoles(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['roles', page, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/roles?page=${page}&limit=${limit}`);
      return response.data.data;
    },
  });
}

export function useRole(id) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      const response = await apiClient.get(`/roles/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/roles', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.put(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

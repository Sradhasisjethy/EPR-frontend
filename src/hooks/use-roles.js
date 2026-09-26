import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';

export function useRoles(params = {}, options = {}) {
  return useQuery({
    ...options,
    queryKey: ['roles', params],
    queryFn: async () => (await apiClient.get('/roles', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['roles'], '/roles');

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

export function useRoleMembers(roleId) {
  return useQuery({
    queryKey: ['role-members', roleId],
    queryFn: async () => (await apiClient.get(`/roles/${roleId}/members`)).data.data,
    enabled: !!roleId,
  });
}

export function useAssignRoleMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, employeeId }) => {
      const response = await apiClient.post(`/roles/${roleId}/members`, { employeeId });
      return response.data;
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['role-members', roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useRemoveRoleMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, employeeId }) => {
      await apiClient.delete(`/roles/${roleId}/members/${employeeId}`);
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['role-members', roleId] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

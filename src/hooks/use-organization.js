import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';

export function useOrganizations(params = {}, options = {}) {
  return useQuery({
    ...options,
    queryKey: ['organizations', params],
    queryFn: async () => (await apiClient.get('/organizations', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['organizations'], '/organizations');

export function useOffices(params = {}, options = {}) {
  return useQuery({
    ...options,
    queryKey: ['offices', params],
    queryFn: async () => (await apiClient.get('/offices', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['offices'], '/offices');

export function useDepartments(params = {}, options = {}) {
  return useQuery({
    ...options,
    queryKey: ['departments', params],
    queryFn: async () => (await apiClient.get('/departments', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['departments'], '/departments');

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/organizations', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.put(`/organizations/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/organizations/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useCreateOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/offices', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offices'] }),
  });
}

export function useUpdateOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.put(`/offices/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offices'] }),
  });
}

export function useDeleteOffice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/offices/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offices'] }),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/departments', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.put(`/departments/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/departments/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useOrganizations(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['organizations', page, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/organizations?page=${page}&limit=${limit}`);
      return response.data.data;
    },
  });
}

export function useOffices(page = 1, limit = 20, organizationId = '') {
  return useQuery({
    queryKey: ['offices', page, limit, organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (organizationId) params.append('organizationId', organizationId);
      const response = await apiClient.get(`/offices?${params.toString()}`);
      return response.data.data;
    },
  });
}

export function useDepartments(page = 1, limit = 20, organizationId = '', officeId = '') {
  return useQuery({
    queryKey: ['departments', page, limit, organizationId, officeId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (organizationId) params.append('organizationId', organizationId);
      if (officeId) params.append('officeId', officeId);
      const response = await apiClient.get(`/departments?${params.toString()}`);
      return response.data.data;
    },
  });
}

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

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

export function useOffices(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['offices', page, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/offices?page=${page}&limit=${limit}`);
      return response.data.data;
    },
  });
}

export function useDepartments(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['departments', page, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/departments?page=${page}&limit=${limit}`);
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

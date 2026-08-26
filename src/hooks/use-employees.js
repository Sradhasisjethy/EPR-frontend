import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useEmployees(params = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => (await apiClient.get('/users', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useEmployee(id) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newEmployee) => {
      const response = await apiClient.post('/users', newEmployee);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.put(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useEmployeeDocuments(id) {
  return useQuery({
    queryKey: ['employees', id, 'documents'],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${id}/documents`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useUploadEmployeeDocument(employeeId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const response = await apiClient.post(`/users/${employeeId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'documents'] });
    },
  });
}

export function useDeleteEmployeeDocument(employeeId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId) => {
      await apiClient.delete(`/users/${employeeId}/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'documents'] });
    },
  });
}

export function useVerifyEmployeeDocument(employeeId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, isVerified }) => {
      const response = await apiClient.patch(`/users/${employeeId}/documents/${documentId}/verify`, { isVerified });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'documents'] });
    },
  });
}

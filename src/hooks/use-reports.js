import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useSavedReports(params = {}) {
  return useQuery({
    queryKey: ['saved-reports', params],
    queryFn: async () => (await apiClient.get('/reports', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useCreateSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/reports', data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { await apiClient.delete(`/reports/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });
}

export function useRunReport() {
  return useMutation({
    mutationFn: async ({ reportType, params }) => (await apiClient.post('/reports/run', { reportType, params })).data.data,
  });
}

export function useRunSavedReport() {
  return useMutation({
    mutationFn: async ({ id, params }) => (await apiClient.post(`/reports/${id}/run`, { params })).data.data,
  });
}

/**
 * FR-M27-2: downloads a report as CSV or PDF. Uses a blob rather than a plain
 * link because the endpoint is a POST (the report parameters don't belong in a
 * URL) and needs the session cookie.
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async ({ reportType, params, format }) => {
      const response = await apiClient.post(
        '/reports/export',
        { reportType, params, format },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return true;
    },
  });
}

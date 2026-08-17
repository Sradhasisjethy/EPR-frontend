import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useGstr1(params) {
  return useQuery({
    queryKey: ['gstr', 'gstr1', params],
    queryFn: async () => (await apiClient.get('/gstr/gstr1', { params })).data.data,
    enabled: !!(params?.factoryId && params?.fromDate && params?.toDate),
  });
}

export function useGstr3b(params) {
  return useQuery({
    queryKey: ['gstr', 'gstr3b', params],
    queryFn: async () => (await apiClient.get('/gstr/gstr3b', { params })).data.data,
    enabled: !!(params?.factoryId && params?.fromDate && params?.toDate),
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useNotifications(params = {}, options = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => (await apiClient.get('/notifications', { params })).data.data,
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => (await apiClient.get('/notifications/unread-count')).data.data,
    // The bell should reflect a nightly job that ran while the tab was open.
    refetchInterval: 60000,
  });
}

const invalidate = (qc) => qc.invalidateQueries({ queryKey: ['notifications'] });

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.put(`/notifications/${id}/read`)).data.data,
    onSuccess: () => invalidate(qc),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.put('/notifications/read-all')).data.data,
    onSuccess: () => invalidate(qc),
  });
}

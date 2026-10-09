import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      const data = response.data.data;
      return {
        id: data.id,
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        role: data.role,
        permissions: data.permissions || [],
        // The tenant's sidebar customisation, served with the session so every
        // user gets it — not only those who can read settings.
        navigationPreferences: data.navigationPreferences || null,
      };
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials) => {
      const response = await apiClient.post('/auth/login', credentials);
      const token = response.data?.data?.accessToken;
      const refreshToken = response.data?.data?.refreshToken;
      if (token) {
        localStorage.setItem('infideep-access-token', token);
      }
      if (refreshToken) {
        localStorage.setItem('infideep-refresh-token', refreshToken);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        const storedRefreshToken = localStorage.getItem('infideep-refresh-token');
        await apiClient.post('/auth/logout', { refreshToken: storedRefreshToken || undefined });
      } catch {
        // Ignore logout network errors so client cleanup proceeds
      }
    },
    onSettled: () => {
      localStorage.removeItem('infideep-access-token');
      localStorage.removeItem('infideep-refresh-token');
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/auth/forgot-password', data);
      return response.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/auth/reset-password', data);
      return response.data;
    },
  });
}

/**
 * Both of these end every session the user has — the backend revokes all
 * refresh tokens and retires access tokens — so this device signs out too.
 */
const endLocalSession = (queryClient) => {
  localStorage.removeItem('infideep-access-token');
  localStorage.removeItem('infideep-refresh-token');
  queryClient.clear();
  window.location.href = '/login';
};

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      return response.data;
    },
    onSuccess: () => endLocalSession(queryClient),
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/logout-all');
      return response.data;
    },
    onSuccess: () => endLocalSession(queryClient),
  });
}

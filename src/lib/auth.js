import { apiClient } from './api-client';

export async function checkSession() {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  } catch {
    return null;
  }
}

export async function logout() {
  await apiClient.post('/auth/logout');
  window.location.href = '/login';
}

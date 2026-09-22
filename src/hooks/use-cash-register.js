import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/** The open session at this factory's till, or null. */
export function useCurrentTill(factoryId) {
  return useQuery({
    queryKey: ['cash-register', 'current', factoryId],
    queryFn: async () => (await apiClient.get('/cash-register/sessions/current', { params: { factoryId } })).data.data,
    enabled: !!factoryId,
  });
}

export function useTillSessions(params = {}) {
  return useQuery({
    queryKey: ['cash-register', 'sessions', params],
    queryFn: async () => (await apiClient.get('/cash-register/sessions', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useTillSession(id) {
  return useQuery({
    queryKey: ['cash-register', 'session', id],
    queryFn: async () => (await apiClient.get(`/cash-register/sessions/${id}`)).data.data,
    enabled: !!id,
  });
}

const refresh = (qc) => {
  qc.invalidateQueries({ queryKey: ['cash-register'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
};

export function useOpenTill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/cash-register/sessions', data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useCloseTill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/cash-register/sessions/${id}/close`, data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

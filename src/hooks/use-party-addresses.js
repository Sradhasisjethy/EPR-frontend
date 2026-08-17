import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function usePartyAddresses(partyId) {
  return useQuery({
    queryKey: ['party-addresses', partyId],
    queryFn: async () => (await apiClient.get(`/parties/${partyId}/addresses`)).data.data,
    enabled: !!partyId,
  });
}

const invalidate = (qc, partyId) => qc.invalidateQueries({ queryKey: ['party-addresses', partyId] });

export function useCreatePartyAddress(partyId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post(`/parties/${partyId}/addresses`, data)).data.data,
    onSuccess: () => invalidate(qc, partyId),
  });
}
export function useUpdatePartyAddress(partyId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/parties/${partyId}/addresses/${id}`, data)).data.data,
    onSuccess: () => invalidate(qc, partyId),
  });
}
export function useDeletePartyAddress(partyId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => { await apiClient.delete(`/parties/${partyId}/addresses/${id}`); },
    onSuccess: () => invalidate(qc, partyId),
  });
}

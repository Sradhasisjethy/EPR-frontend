import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { createResourceHooks } from '@/lib/create-resource-hooks';

export const {
  useList: useParties,
  useGet: useParty,
  useCreate: useCreateParty,
  useUpdate: useUpdateParty,
  useDelete: useDeleteParty,
} = createResourceHooks('parties', '/parties');

export function useUpsertWageProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ partyId, ...data }) => {
      const response = await apiClient.put(`/parties/${partyId}/wage-profile`, data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parties'] }),
  });
}

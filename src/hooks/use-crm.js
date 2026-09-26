import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { registerListPrefetch } from '@/lib/list-prefetch';

const refresh = (qc) => qc.invalidateQueries({ queryKey: ['crm'] });

export function useLeads(params = {}) {
  return useQuery({
    queryKey: ['crm', 'leads', params],
    queryFn: async () => (await apiClient.get('/crm/leads', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}
registerListPrefetch(['crm', 'leads'], '/crm/leads');

export function useLead(id) {
  return useQuery({
    queryKey: ['crm', 'lead', id],
    queryFn: async () => (await apiClient.get(`/crm/leads/${id}`)).data.data,
    enabled: !!id,
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ['crm', 'pipeline'],
    queryFn: async () => (await apiClient.get('/crm/pipeline')).data.data,
  });
}

/** Follow-ups still to do — the list a salesperson works from. */
export function usePendingTasks(params = {}) {
  return useQuery({
    select: (data) => (Array.isArray(data) ? data : []),
    queryKey: ['crm', 'tasks', params],
    queryFn: async () => (await apiClient.get('/crm/tasks', { params })).data.data,
  });
}

export function useLeadSources() {
  return useQuery({
    select: (data) => (Array.isArray(data) ? data : []),
    queryKey: ['crm', 'lead-sources'],
    queryFn: async () => (await apiClient.get('/crm/lead-sources')).data.data,
    staleTime: Infinity,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (data) => (await apiClient.post('/crm/leads', data)).data.data, onSuccess: () => refresh(qc) });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, ...data }) => (await apiClient.put(`/crm/leads/${id}`, data)).data.data, onSuccess: () => refresh(qc) });
}

export function useSetLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }) => (await apiClient.put(`/crm/leads/${id}/status`, { status, reason })).data.data,
    onSuccess: () => refresh(qc),
  });
}

/** Converting creates a customer, so party lists change too. */
export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customerPartyId }) => (await apiClient.post(`/crm/leads/${id}/convert`, customerPartyId ? { customerPartyId } : {})).data.data,
    onSuccess: () => { refresh(qc); qc.invalidateQueries({ queryKey: ['parties'] }); },
  });
}

export function useAddLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, ...data }) => (await apiClient.post(`/crm/leads/${leadId}/activities`, data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useCompleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.put(`/crm/activities/${id}/complete`)).data.data,
    onSuccess: () => refresh(qc),
  });
}

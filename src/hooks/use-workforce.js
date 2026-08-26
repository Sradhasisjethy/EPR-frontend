import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const invalidateStock = (qc) => {
  qc.invalidateQueries({ queryKey: ['stock-lots'] });
  qc.invalidateQueries({ queryKey: ['stock-ledger'] });
  qc.invalidateQueries({ queryKey: ['stock-balance'] });
  qc.invalidateQueries({ queryKey: ['ledger'] });
};

// Contractor material issues
export function useMaterialIssues(params = {}) {
  return useQuery({ queryKey: ['contractor-material-issues', params], queryFn: async () => (await apiClient.get('/workforce/contractor/material-issues', { params })).data.data, placeholderData: (prev) => prev });
}
export function useIssueMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/workforce/contractor/material-issues', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractor-material-issues'] }); invalidateStock(qc); },
  });
}

// Contractor production entries
export function useContractorEntries(params = {}) {
  return useQuery({ queryKey: ['contractor-production-entries', params], queryFn: async () => (await apiClient.get('/workforce/contractor/production-entries', { params })).data.data, placeholderData: (prev) => prev });
}
export function useCreateContractorEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/workforce/contractor/production-entries', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractor-production-entries'] }); qc.invalidateQueries({ queryKey: ['contractor-material-issues'] }); invalidateStock(qc); },
  });
}

// Labour attendance
export function useAttendance(params = {}) {
  return useQuery({ queryKey: ['attendance', params], queryFn: async () => (await apiClient.get('/workforce/labour/attendance', { params })).data.data, placeholderData: (prev) => prev });
}
export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/workforce/labour/attendance', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}

// Advances
export function useAdvances(params = {}) {
  return useQuery({ queryKey: ['advances', params], queryFn: async () => (await apiClient.get('/workforce/advances', { params })).data.data, placeholderData: (prev) => prev });
}
export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/workforce/advances', data)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}
export function useCancelAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/workforce/advances/${id}/cancel`, { reason })).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); qc.invalidateQueries({ queryKey: ['ledger'] }); },
  });
}

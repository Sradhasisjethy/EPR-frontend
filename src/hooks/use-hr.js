import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const refresh = (qc) => {
  qc.invalidateQueries({ queryKey: ['hr'] });
};

export function useLeaveTypes(params = {}) {
  return useQuery({
    select: (data) => (Array.isArray(data) ? data : []),
    queryKey: ['hr', 'leave-types', params],
    queryFn: async () => (await apiClient.get('/hr/leave-types', { params })).data.data,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/hr/leave-types', data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/hr/leave-types/${id}`, data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useLeaveRequests(params = {}) {
  return useQuery({
    queryKey: ['hr', 'leave-requests', params],
    queryFn: async () => (await apiClient.get('/hr/leave-requests', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useLeaveBalances(employeeId, date) {
  return useQuery({
    queryKey: ['hr', 'leave-balances', employeeId, date],
    queryFn: async () => (await apiClient.get('/hr/leave-balances', { params: { employeeId, ...(date ? { date } : {}) } })).data.data,
    enabled: !!employeeId,
  });
}

export function useApplyForLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/hr/leave-requests', data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }) => (await apiClient.put(`/hr/leave-requests/${id}/decision`, { status, note })).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await apiClient.put(`/hr/leave-requests/${id}/cancel`)).data.data,
    onSuccess: () => refresh(qc),
  });
}

/** Everyone to mark for a day, with what the leave register already knows. */
export function useAttendanceRoster(date) {
  return useQuery({
    queryKey: ['hr', 'roster', date],
    queryFn: async () => (await apiClient.get('/hr/attendance/roster', { params: { date } })).data.data,
    enabled: !!date,
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/hr/attendance', data)).data.data,
    onSuccess: () => refresh(qc),
  });
}

export function useAttendanceSummary({ from, to, employeeId } = {}) {
  return useQuery({
    queryKey: ['hr', 'attendance-summary', from, to, employeeId],
    queryFn: async () => (await apiClient.get('/hr/attendance/summary', { params: { from, to, ...(employeeId ? { employeeId } : {}) } })).data.data,
    enabled: !!from && !!to,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, publicClient } from '@/lib/api-client';

/**
 * DPDP Act: the application owner's privacy desk (/privacy/*, open only to the
 * accounts the server names in PLATFORM_OWNER_EMAILS) and every user's own
 * privacy (/privacy/me/*). See ERP-backend/src/api/privacy.
 */

const refresh = (qc) => qc.invalidateQueries({ queryKey: ['privacy'] });
const get = async (url, params) => (await apiClient.get(url, { params })).data.data;
const mutation = (qc, fn) => ({ mutationFn: fn, onSuccess: () => refresh(qc) });

/** Saves a JSON download the API streamed back, under the name it gave. */
const download = async (url, params, fallbackName) => {
  const res = await apiClient.get(url, { params, responseType: 'blob' });
  const disposition = res.headers?.['content-disposition'] || '';
  const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
};

// ------------------------------------------------------------ self-service

export function useMyPrivacy({ enabled = true } = {}) {
  return useQuery({ queryKey: ['privacy', 'me'], queryFn: () => get('/privacy/me'), enabled, staleTime: 5 * 60 * 1000 });
}

export function useAcknowledgeNotice() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async () => (await apiClient.post('/privacy/me/acknowledge')).data.data));
}

export function useGiveMyConsent() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (purposeCode) => (await apiClient.post('/privacy/me/consents', { purposeCode })).data.data));
}

export function useWithdrawMyConsent() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, reason }) => (await apiClient.put(`/privacy/me/consents/${id}/withdraw`, { reason })).data.data));
}

export function useMyRequest() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (body) => (await apiClient.post('/privacy/me/requests', body)).data.data));
}

export function useSetMyNominee() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (nominee) => (await apiClient.put('/privacy/me/nominee', { nominee })).data.data));
}

export const downloadMyData = () => download('/privacy/me/export', undefined, 'my-personal-data.json');

// ------------------------------------------------------------ officer desk

export function usePrivacyOrganisations() {
  return useQuery({
    queryKey: ['privacy', 'organisations'],
    queryFn: () => get('/privacy/organisations'),
    select: (d) => (Array.isArray(d) ? d : []),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrivacyOverview() {
  return useQuery({ queryKey: ['privacy', 'overview'], queryFn: () => get('/privacy/overview') });
}

export function usePrivacyProfile() {
  return useQuery({ queryKey: ['privacy', 'profile'], queryFn: () => get('/privacy/profile') });
}

export function useUpdatePrivacyProfile() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (body) => (await apiClient.put('/privacy/profile', body)).data.data));
}

export function usePrivacyNotices() {
  return useQuery({ queryKey: ['privacy', 'notices'], queryFn: () => get('/privacy/notices'), select: (d) => (Array.isArray(d) ? d : []) });
}

export function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (body = {}) => (await apiClient.post('/privacy/notices', body)).data.data));
}

export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, ...body }) => (await apiClient.put(`/privacy/notices/${id}`, body)).data.data));
}

export function usePublishNotice() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (id) => (await apiClient.post(`/privacy/notices/${id}/publish`)).data.data));
}

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (id) => (await apiClient.delete(`/privacy/notices/${id}`)).data.data));
}

export function useConsents(params = {}) {
  return useQuery({ queryKey: ['privacy', 'consents', params], queryFn: () => get('/privacy/consents', params), placeholderData: (p) => p });
}

export function useRecordConsent() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (body) => (await apiClient.post('/privacy/consents', body)).data.data));
}

export function useWithdrawConsent() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, reason }) => (await apiClient.put(`/privacy/consents/${id}/withdraw`, { reason })).data.data));
}

export function usePrivacyRequests(params = {}) {
  return useQuery({ queryKey: ['privacy', 'requests', params], queryFn: () => get('/privacy/requests', params), placeholderData: (p) => p });
}

export function usePrivacyRequest(id) {
  return useQuery({ queryKey: ['privacy', 'request', id], queryFn: () => get(`/privacy/requests/${id}`), enabled: !!id });
}

export function useCreatePrivacyRequest() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (body) => (await apiClient.post('/privacy/requests', body)).data.data));
}

export function useUpdatePrivacyRequest() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, ...body }) => (await apiClient.put(`/privacy/requests/${id}`, body)).data.data));
}

/** verify / reject / complete — one hook, the action names the endpoint. */
export function usePrivacyRequestAction() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, action, ...body }) => (await apiClient.post(`/privacy/requests/${id}/${action}`, body)).data.data));
}

export const downloadRequestData = (request) =>
  download(`/privacy/requests/${request.id}/export`, undefined, `personal-data-${request.requestNumber.replace(/\//g, '-')}.json`);

export function useBreaches() {
  return useQuery({ queryKey: ['privacy', 'breaches'], queryFn: () => get('/privacy/breaches'), select: (d) => (Array.isArray(d) ? d : []) });
}

export function useBreachReport(id) {
  return useQuery({ queryKey: ['privacy', 'breach-report', id], queryFn: () => get(`/privacy/breaches/${id}/report`), enabled: !!id });
}

export function useCreateBreach() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (body) => (await apiClient.post('/privacy/breaches', body)).data.data));
}

export function useUpdateBreach() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, ...body }) => (await apiClient.put(`/privacy/breaches/${id}`, body)).data.data));
}

export function useBreachStep() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, ...body }) => (await apiClient.post(`/privacy/breaches/${id}/steps`, body)).data.data));
}

export function useCloseBreach() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (id) => (await apiClient.post(`/privacy/breaches/${id}/close`)).data.data));
}

export function useRetentionRules() {
  return useQuery({ queryKey: ['privacy', 'retention'], queryFn: () => get('/privacy/retention'), select: (d) => (Array.isArray(d) ? d : []) });
}

export function useUpdateRetentionRule() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async ({ id, ...body }) => (await apiClient.put(`/privacy/retention/${id}`, body)).data.data));
}

export function useRunRetentionRule() {
  const qc = useQueryClient();
  return useMutation(mutation(qc, async (id) => (await apiClient.post(`/privacy/retention/${id}/run`)).data.data));
}

// ------------------------------------------------------------ public page

/** The application owner's notice — one for the whole platform. */
export function usePublicPrivacy() {
  return useQuery({
    queryKey: ['public-privacy'],
    queryFn: async () => (await publicClient.get('/public/privacy')).data.data,
    retry: false,
  });
}

export function useSubmitPublicRequest() {
  return useMutation({ mutationFn: async (body) => (await publicClient.post('/public/privacy/requests', body)).data.data });
}

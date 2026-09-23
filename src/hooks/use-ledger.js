import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * The chart of accounts. With no params this is every active account, as it
 * always was; `{ moneyOnly: true }` narrows it to cash and bank accounts, and
 * `{ subType: 'BANK' }` to one kind.
 */
export function useAccounts(params = {}) {
  return useQuery({
    select: (data) => (Array.isArray(data) ? data : []),
    queryKey: ['ledger', 'accounts', params],
    queryFn: async () => (await apiClient.get('/ledger/accounts', { params })).data.data,
  });
}

/** Cash and bank accounts, for "deposit to" / "paid from" pickers. */
export function useMoneyAccounts() {
  return useAccounts({ moneyOnly: 'true' });
}

export function useAccountGroups() {
  return useQuery({
    select: (data) => (Array.isArray(data) ? data : []),
    queryKey: ['ledger', 'account-groups'],
    queryFn: async () => (await apiClient.get('/ledger/account-groups')).data.data,
    staleTime: Infinity,
  });
}

const invalidateLedger = (qc) => qc.invalidateQueries({ queryKey: ['ledger'] });

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/ledger/accounts', data)).data.data,
    onSuccess: () => invalidateLedger(qc),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await apiClient.put(`/ledger/accounts/${id}`, data)).data.data,
    onSuccess: () => invalidateLedger(qc),
  });
}

export function useTrialBalance(factoryId) {
  return useQuery({
    queryKey: ['ledger', 'trial-balance', factoryId],
    queryFn: async () => (await apiClient.get('/ledger/trial-balance', { params: { factoryId } })).data.data,
    enabled: !!factoryId,
  });
}

/**
 * Takes partyId inside the params object (rather than as a leading positional
 * arg) so it satisfies the shared list-hook contract and can be handed straight
 * to usePaginated — wrapping it in a callback there would call a hook inside a
 * callback, which the rules of hooks forbid.
 */
export function usePartyLedger({ partyId, ...params } = {}) {
  return useQuery({
    queryKey: ['ledger', 'party', partyId, params],
    queryFn: async () => (await apiClient.get(`/ledger/party/${partyId}`, { params })).data.data,
    enabled: !!partyId,
    placeholderData: (prev) => prev,
  });
}

export function useCashBook(factoryId, params = {}) {
  return useQuery({
    queryKey: ['ledger', 'cash-book', factoryId, params],
    queryFn: async () => (await apiClient.get('/ledger/cash-book', { params: { factoryId, ...params } })).data.data,
    enabled: !!factoryId,
  });
}

export function useVouchers(params = {}) {
  return useQuery({
    queryKey: ['ledger', 'vouchers', params],
    queryFn: async () => (await apiClient.get('/ledger/vouchers', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

export function useVoucher(id) {
  return useQuery({
    queryKey: ['ledger', 'voucher', id],
    queryFn: async () => (await apiClient.get(`/ledger/vouchers/${id}`)).data.data,
    enabled: !!id,
  });
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/ledger/vouchers', data)).data.data,
    onSuccess: () => { invalidateLedger(qc); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}

export function useCancelVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await apiClient.put(`/ledger/vouchers/${id}/cancel`, { reason })).data.data,
    onSuccess: () => { invalidateLedger(qc); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}

export function useProfitAndLoss(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['ledger', 'profit-and-loss', params],
    queryFn: async () => (await apiClient.get('/ledger/profit-and-loss', { params })).data.data,
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useBalanceSheet(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['ledger', 'balance-sheet', params],
    queryFn: async () => (await apiClient.get('/ledger/balance-sheet', { params })).data.data,
    enabled,
    placeholderData: (prev) => prev,
  });
}

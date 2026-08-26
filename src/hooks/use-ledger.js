import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useAccounts() {
  return useQuery({ queryKey: ['ledger', 'accounts'], queryFn: async () => (await apiClient.get('/ledger/accounts')).data.data });
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

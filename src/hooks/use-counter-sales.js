import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Counter sales — a walk-in buying across the counter, as opposed to the
 * order → challan → invoice chain a contractor goes through.
 *
 * The rows are ordinary sales invoices (the API filters them by channel), so
 * they print, age and reach GSTR-1 through exactly the same paths as any other
 * invoice. Nothing here is a parallel document type.
 */
export function useCounterSales(params = {}) {
  return useQuery({
    queryKey: ['counter-sales', params],
    queryFn: async () => (await apiClient.get('/retail/counter-sales', { params })).data.data,
    placeholderData: (prev) => prev,
  });
}

/**
 * What the basket comes to, priced by the server.
 *
 * Deliberately not computed in the browser. The counter has to state a figure
 * before the sale is made, and the payment has to settle the invoice to the
 * paisa — reimplementing GST determination, per-line rounding and the
 * round-to-rupee adjustment here would be a second copy of that arithmetic,
 * free to disagree with the first.
 *
 * Returns nothing until every line has a product and a quantity, because a
 * half-typed line is not a question the server can answer.
 */
export function useCounterSaleQuote({ factoryId, customer, lines, invoiceDate }) {
  const ready =
    !!factoryId && Array.isArray(lines) && lines.length > 0 && lines.every((l) => l.productId && Number(l.quantity) > 0);

  const payload = { factoryId, ...(customer ? { customer } : {}), ...(invoiceDate ? { invoiceDate } : {}), lines };

  return useQuery({
    queryKey: ['counter-sales', 'quote', payload],
    queryFn: async () => (await apiClient.post('/retail/counter-sales/quote', payload)).data.data,
    enabled: ready,
    // A quote is a statement about stock as well as price, so it should not be
    // served from cache after the shelf has moved.
    staleTime: 0,
    retry: false,
    placeholderData: (prev) => prev,
  });
}

export function useCreateCounterSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => (await apiClient.post('/retail/counter-sales', data)).data.data,
    onSuccess: () => {
      // One counter sale moves stock, raises an invoice and takes money, so it
      // invalidates rather more than its own list.
      qc.invalidateQueries({ queryKey: ['counter-sales'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock-lots'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Reverses a counter sale and the money it took, in one call.
 *
 * Not `useCancelInvoice`: that refuses while a receipt is allocated and tells
 * the user to cancel the receipt first — which leaves the sale posted and
 * reading as unpaid until they also come back and cancel the invoice. A sale
 * made in one motion at a counter is undone in one motion too.
 */
export function useCancelCounterSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) =>
      (await apiClient.post(`/retail/counter-sales/${id}/cancel`, { reason })).data.data,
    // A counter sale touches invoices, receipts, stock and the ledger, so the
    // screens showing any of those are all stale now.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery } from '@/test/render';
import { PaymentDetailDialog } from './payment-detail-dialog';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

const show = (props) =>
  renderWithQuery(<PaymentDetailDialog open onOpenChange={() => {}} {...props} />);

/**
 * A receipt's allocations are stored polymorphically — `invoiceType` plus a
 * bare `invoiceId` — so the list row cannot say which invoice the money went
 * against. Only the detail read resolves the number, which is the reason this
 * dialog fetches rather than rendering the row it was opened from.
 */
describe('PaymentDetailDialog', () => {
  beforeEach(() => apiClient.get.mockReset());

  it('names the invoices a receipt was applied to', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          receiptNumber: 'RCP/BBSR/0001',
          customer: { name: 'Sradhasis jethy' },
          receiptDate: '2026-09-09',
          status: 'POSTED',
          totalAmountPaise: 10620000,
          unallocatedAmountPaise: 0,
          modes: [{ mode: 'CASH', amountPaise: 10620000 }],
          allocations: [
            { id: 'a1', invoiceType: 'SALES', invoiceNumber: 'INV/BBSR/0001', allocatedAmountPaise: 10620000 },
          ],
        },
      },
    });

    show({ kind: 'Receipts', record: { id: 'r1', receiptNumber: 'RCP/BBSR/0001' } });

    await waitFor(() => expect(screen.getByText('INV/BBSR/0001')).toBeInTheDocument());
    // The mode split is the other thing the table folds into one total.
    expect(screen.getByText('CASH')).toBeInTheDocument();
  });

  it('says so plainly when money is on account rather than applied', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          receiptNumber: 'RCP/BBSR/0002',
          customer: { name: 'Sradhasis jethy' },
          status: 'POSTED',
          totalAmountPaise: 500000,
          unallocatedAmountPaise: 500000,
          modes: [{ mode: 'BANK', amountPaise: 500000 }],
          allocations: [],
        },
      },
    });

    show({ kind: 'Receipts', record: { id: 'r2' } });
    await waitFor(() => expect(screen.getByText(/on account/i)).toBeInTheDocument());
  });

  it('shows a cheque lifecycle without fetching — the row already has it', async () => {
    show({
      kind: 'Cheques',
      record: {
        id: 'c1',
        chequeNumber: '004512',
        bankName: 'SBI',
        party: { name: 'Utkal Manpower' },
        direction: 'OUTBOUND',
        status: 'BOUNCED',
        chequeDate: '2026-09-01',
        amountPaise: 250000,
        presentedAt: '2026-09-03T10:00:00.000Z',
        bouncedAt: '2026-09-04T10:00:00.000Z',
        bounceReason: 'Insufficient funds',
      },
    });

    expect(screen.getByText('Presented')).toBeInTheDocument();
    // "Bounced" is both the status badge and a lifecycle row — the point of the
    // lifecycle is that it also carries when, so assert the timestamps.
    expect(screen.getAllByText('Bounced').length).toBeGreaterThan(1);
    expect(screen.getByText(/Insufficient funds/)).toBeInTheDocument();
    // Presented on the 3rd, bounced on the 4th — neither is in the table.
    expect(screen.getByText(/03\/09\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/04\/09\/2026/)).toBeInTheDocument();
    // No cheque fetch: the row already carries the lifecycle. (DateText does
    // fetch /settings for the tenant date format, which is not this dialog's
    // doing — so assert on the endpoint rather than on the spy as a whole.)
    const fetched = apiClient.get.mock.calls.map(([url]) => String(url));
    expect(fetched.some((u) => /cheque|receipt|payment/i.test(u))).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { SalesReturnFormDialog } from './sales-return-form-dialog';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const list = (rows) => ({ data: { data: { rows, count: rows.length, page: 1, limit: 10, totalPages: 1 } } });

const RETURNABLE = {
  invoices: [
    {
      invoiceId: 'inv1', invoiceNumber: 'INV/BBSR/0007', invoiceDate: '2026-09-12', totalPaise: 1180000, fullyReturned: false,
      lines: [
        { salesInvoiceLineId: 'l1', productId: 'p1', productName: 'RCC Pipe 600mm', soldQty: 10, ratePaise: 100000, soldValuePaise: 1000000, gstRatePercent: 18, returnedQty: 2, returnableQty: 8 },
        { salesInvoiceLineId: 'l2', productId: 'p2', productName: 'EPDM Gasket', soldQty: 20, ratePaise: 5000, soldValuePaise: 100000, gstRatePercent: 18, returnedQty: 20, returnableQty: 0 },
      ],
    },
    { invoiceId: 'inv0', invoiceNumber: 'INV/BBSR/0001', invoiceDate: '2026-08-02', totalPaise: 500000, fullyReturned: true, lines: [] },
  ],
  unlinkedReturns: [{ productId: 'p3', productName: 'Paver', quantity: 4 }],
};

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.get.mockImplementation((url) => {
    const at = String(url);
    if (at.includes('/returns/returnable')) return Promise.resolve({ data: { data: RETURNABLE } });
    if (at.includes('/factories')) return Promise.resolve(list([{ id: 'f1', name: 'Bhubaneswar Plant' }]));
    if (at.includes('/parties')) return Promise.resolve(list([{ id: 'c1', name: 'Sradhasis Jethy' }]));
    if (at.includes('/products')) return Promise.resolve(list([{ id: 'p9', name: 'Kerb Stone' }]));
    return Promise.resolve(list([]));
  });
  apiClient.post.mockResolvedValue({ data: { data: { id: 'sr1' } } });
});

const openForm = async (u) => {
  renderWithQuery(<SalesReturnFormDialog open onOpenChange={() => {}} />);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Bhubaneswar Plant' })).toBeInTheDocument());
  await u.selectOptions(screen.getByLabelText('Factory'), 'f1');
  // The customer picker searches rather than listing: there are 429 of them,
  // and a <select> could only ever offer the first hundred.
  await u.click(screen.getByRole('combobox', { name: 'Customer' }));
  await u.click(await screen.findByRole('option', { name: /Sradhasis Jethy/ }));
};

describe('Recording a sales return', () => {
  it('asks for a customer before it can show anything', async () => {
    renderWithQuery(<SalesReturnFormDialog open onOpenChange={() => {}} />);
    expect(await screen.findByText('Choose a factory and a customer to see what they bought.')).toBeInTheDocument();
  });

  it('shows what the customer bought, with what is left to return', async () => {
    const u = userEvent.setup();
    await openForm(u);

    const row = (await screen.findByText('RCC Pipe 600mm')).closest('div');
    expect(within(row).getByText('10')).toBeInTheDocument();      // sold
    expect(within(row).getByText('₹1,000.00')).toBeInTheDocument(); // rate from the invoice
    expect(within(row).getByText('8')).toBeInTheDocument();        // returnable
    // The invoiced line now reads in full, so a rate can never be mistaken for
    // the line total.
    expect(screen.getByText(/invoiced 10 × ₹1,000.00 = ₹10,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/2 already back/)).toBeInTheDocument();
  });

  it('will not let more come back than the invoice has left', async () => {
    const u = userEvent.setup();
    await openForm(u);
    await u.type(await screen.findByLabelText('Quantity returned of RCC Pipe 600mm'), '9');

    expect(screen.getByText('One line is more than that invoice has left to return.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record Return' })).toBeDisabled();
  });

  it('offers nothing to type on a line that is fully returned', async () => {
    const u = userEvent.setup();
    await openForm(u);
    expect(await screen.findByLabelText('Quantity returned of EPDM Gasket')).toBeDisabled();
  });

  it('sends the invoice, the quantity and the invoice’s own rate', async () => {
    const u = userEvent.setup();
    await openForm(u);
    await u.type(screen.getByLabelText('Reason'), 'damaged in transit');
    await u.type(await screen.findByLabelText('Quantity returned of RCC Pipe 600mm'), '3');

    // 3 × ₹1,000 taxable, plus 18% GST = ₹3,540 credited to the customer.
    expect(screen.getByText('₹3,000.00 + GST')).toBeInTheDocument();
    expect(screen.getByText('Taxable ₹3,000.00')).toBeInTheDocument();
    expect(screen.getByText('· GST ₹540.00')).toBeInTheDocument();
    expect(screen.getByText('₹3,540.00')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Record Return' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/returns/sales-returns');
    expect(body).toMatchObject({
      factoryId: 'f1', customerPartyId: 'c1', salesInvoiceId: 'inv1', reason: 'damaged in transit',
      lines: [{ productId: 'p1', quantity: 3, ratePaise: 100000 }],
    });
  });

  it('fills the whole invoice in one click', async () => {
    const u = userEvent.setup();
    await openForm(u);
    await u.click(await screen.findByRole('button', { name: /Return everything left/ }));
    expect(screen.getByLabelText('Quantity returned of RCC Pipe 600mm')).toHaveValue(8);
    expect(screen.getByText('₹8,000.00 + GST')).toBeInTheDocument();
  });

  it('keeps a fully returned invoice from being chosen', async () => {
    const u = userEvent.setup();
    await openForm(u);
    const option = await screen.findByRole('option', { name: /INV\/BBSR\/0001/ });
    expect(option).toBeDisabled();
    expect(option.textContent).toMatch(/fully returned/);
  });

  it('says what came back earlier without an invoice, rather than silently ignoring it', async () => {
    const u = userEvent.setup();
    await openForm(u);
    expect(await screen.findByText(/4 × Paver/)).toBeInTheDocument();
  });

  it('drops the invoice reference when an off-invoice item is mixed in', async () => {
    const u = userEvent.setup();
    await openForm(u);
    await u.type(screen.getByLabelText('Reason'), 'mixed return');
    await u.type(await screen.findByLabelText('Quantity returned of RCC Pipe 600mm'), '1');
    await u.click(screen.getByRole('button', { name: /not on an invoice/ }));
    await u.selectOptions(screen.getByLabelText('Product for extra line 1'), 'p9');
    await u.type(screen.getByLabelText('Quantity for extra line 1'), '2');
    await u.type(screen.getByLabelText('Rate for extra line 1'), '150');
    await u.click(screen.getByRole('button', { name: 'Record Return' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const body = apiClient.post.mock.calls[0][1];
    expect(body.salesInvoiceId).toBeUndefined();
    expect(body.lines).toEqual([
      { productId: 'p1', quantity: 1, ratePaise: 100000 },
      { productId: 'p9', quantity: 2, ratePaise: 15000 },
    ]);
  });

  it('still records a return for a customer with no invoices here', async () => {
    apiClient.get.mockImplementation((url) => {
      const at = String(url);
      if (at.includes('/returns/returnable')) return Promise.resolve({ data: { data: { invoices: [], unlinkedReturns: [] } } });
      if (at.includes('/factories')) return Promise.resolve(list([{ id: 'f1', name: 'Bhubaneswar Plant' }]));
      if (at.includes('/parties')) return Promise.resolve(list([{ id: 'c1', name: 'Sradhasis Jethy' }]));
      if (at.includes('/products')) return Promise.resolve(list([{ id: 'p9', name: 'Kerb Stone' }]));
      return Promise.resolve(list([]));
    });
    const u = userEvent.setup();
    await openForm(u);
    expect(await screen.findByText(/No posted invoices for this customer/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not on an invoice/ })).toBeInTheDocument();
  });
});

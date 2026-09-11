import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { CounterSaleDialog } from './counter-sale-dialog';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The picker does its own server search; stubbed so these tests are about the
// sale, not about choosing a product.
vi.mock('@/components/products/product-picker', () => ({
  ProductPicker: ({ value, onChange }) => (
    <button type="button" data-testid="pick-product" onClick={() => onChange('prod-1')}>
      {value || 'pick'}
    </button>
  ),
}));
vi.mock('@/components/sales/line-availability', () => ({ LineAvailability: () => null }));

const QUOTE = {
  subtotalPaise: 1000000,
  cgstPaise: 90000,
  sgstPaise: 90000,
  igstPaise: 0,
  roundOffPaise: 0,
  totalPaise: 1180000,
  lines: [],
};

const listResponse = (rows) => ({ data: { data: { rows, count: rows.length } } });

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.get.mockImplementation((url) => {
    if (url.includes('factories')) return Promise.resolve(listResponse([{ id: 'f1', name: 'Bhuasuni Plant' }]));
    if (url.includes('parties')) return Promise.resolve(listResponse([{ id: 'c1', name: 'Ctr Contractor' }]));
    if (url.includes('reason-codes')) {
      return Promise.resolve({ data: { data: [
        { code: 'NOT_NEEDED', label: 'Customer does not want it', requiresNote: false, isActive: true },
        { code: 'OTHER', label: 'Other', requiresNote: true, isActive: true },
      ] } });
    }
    return Promise.resolve(listResponse([]));
  });
  apiClient.post.mockImplementation((url) => {
    if (url.includes('/quote')) return Promise.resolve({ data: { data: QUOTE } });
    return Promise.resolve({
      data: { data: { invoice: { invoiceNumber: 'INV/BBSR/0007', totalPaise: 1180000 }, customer: { name: 'Ramesh Sahoo' } } },
    });
  });
});

const open = () => renderWithQuery(<CounterSaleDialog open onOpenChange={() => {}} />);

/** Fills factory + one line, which is the minimum that can be priced. */
const fillBasket = async (user) => {
  // The factory list is fetched, so its options do not exist on first paint.
  await waitFor(() => expect(screen.getByRole('option', { name: 'Bhuasuni Plant' })).toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText('Factory'), 'f1');
  await user.click(screen.getByTestId('pick-product'));
  await user.type(screen.getByPlaceholderText('Qty'), '10');
};

describe('CounterSaleDialog', () => {
  it('shows the total the server priced, not one it worked out itself', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);

    // ₹11,800.00 — taxable 10,000 + 18% GST. The point is that this figure
    // arrived from /quote; nothing here multiplies rate by quantity.
    await waitFor(() => expect(screen.getByText('₹11,800.00')).toBeInTheDocument());
    expect(apiClient.post).toHaveBeenCalledWith('/retail/counter-sales/quote', expect.anything());
  });

  it('does not ask the server to price a half-typed line', async () => {
    const user = userEvent.setup();
    open();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Bhuasuni Plant' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Factory'), 'f1');
    await user.click(screen.getByTestId('pick-product'));
    // Product chosen but no quantity yet.
    await waitFor(() => expect(screen.getByText(/Add an item to see the total/i)).toBeInTheDocument());
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('submits the quoted total as the amount collected, never a retyped figure', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await user.type(screen.getByPlaceholderText('Buyer’s name'), 'Ramesh Sahoo');
    await waitFor(() => expect(screen.getByRole('button', { name: /Take ₹11,800.00/ })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: /Take ₹11,800.00/ }));

    await waitFor(() => {
      const sale = apiClient.post.mock.calls.find(([url]) => url === '/retail/counter-sales');
      expect(sale).toBeTruthy();
      // Exactly the quoted total: the server refuses a payment that does not
      // settle the invoice, so any local arithmetic here would break the sale.
      expect(sale[1].payment.modes[0].amountPaise).toBe(1180000);
      expect(sale[1].payment.modes[0].mode).toBe('CASH');
    });
  });

  it('raises the sale on credit when payment is not being collected', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await user.type(screen.getByPlaceholderText('Buyer’s name'), 'Ramesh Sahoo');
    await user.click(screen.getByRole('button', { name: 'On credit' }));

    await user.click(screen.getByRole('button', { name: /Complete on credit/ }));

    await waitFor(() => {
      const sale = apiClient.post.mock.calls.find(([url]) => url === '/retail/counter-sales');
      expect(sale[1].payment).toBeNull();
    });
  });

  it('refuses to submit a walk-in with no name', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByRole('button', { name: /Take ₹/ })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: /Take ₹/ }));

    expect(await screen.findByText(/Enter the buyer/i)).toBeInTheDocument();
    expect(apiClient.post.mock.calls.some(([url]) => url === '/retail/counter-sales')).toBe(false);
  });

  it('requires a vehicle number once delivery is ticked', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await user.type(screen.getByPlaceholderText('Buyer’s name'), 'Ramesh Sahoo');
    await user.click(screen.getByLabelText(/Deliver to the customer/i));
    await waitFor(() => expect(screen.getByRole('button', { name: /Take ₹/ })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: /Take ₹/ }));

    expect(await screen.findByText(/vehicle number is required/i)).toBeInTheDocument();
    expect(apiClient.post.mock.calls.some(([url]) => url === '/retail/counter-sales')).toBe(false);
  });

  it('sends no rate when the counter leaves it blank, so the server prices it', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await user.type(screen.getByPlaceholderText('Buyer’s name'), 'Ramesh Sahoo');
    await waitFor(() => expect(screen.getByRole('button', { name: /Take ₹/ })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /Take ₹/ }));

    await waitFor(() => {
      const sale = apiClient.post.mock.calls.find(([url]) => url === '/retail/counter-sales');
      // A blank rate must be absent, not zero — zero would invoice it free.
      expect(sale[1].lines[0]).not.toHaveProperty('ratePaise');
    });
  });

  it('surfaces the server’s refusal rather than a generic failure', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url.includes('/quote')) return Promise.resolve({ data: { data: QUOTE } });
      return Promise.reject({ response: { data: { message: 'Not enough free stock for "Paver": 5 available to sell, 10 requested.' } } });
    });

    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await user.type(screen.getByPlaceholderText('Buyer’s name'), 'Ramesh Sahoo');
    await waitFor(() => expect(screen.getByRole('button', { name: /Take ₹/ })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /Take ₹/ }));

    expect(await screen.findByText(/Not enough free stock/)).toBeInTheDocument();
  });

  it('shows IGST instead of the CGST/SGST split for an out-of-state buyer', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url.includes('/quote')) {
        return Promise.resolve({
          data: { data: { ...QUOTE, cgstPaise: 0, sgstPaise: 0, igstPaise: 180000 } },
        });
      }
      return Promise.resolve({ data: { data: { invoice: {}, customer: {} } } });
    });

    const user = userEvent.setup();
    open();
    await fillBasket(user);

    await waitFor(() => expect(screen.getByText('IGST')).toBeInTheDocument());
    expect(screen.queryByText('CGST')).not.toBeInTheDocument();
  });
  it('lists accessories the bundle rule added, so the clerk sees what goes in the van', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url.includes('/quote')) {
        return Promise.resolve({
          data: {
            data: {
              ...QUOTE,
              lines: [
                { productId: 'prod-1', productName: 'RCP 600mm', quantity: 2, lineTotalPaise: 1180000, bundleParentProductId: null },
                { productId: 'acc-1', productName: 'EPDM Gasket', quantity: 2, ratePaise: 20000, lineTotalPaise: 47200, bundleParentProductId: 'prod-1' },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: { invoice: {}, customer: {} } } });
    });

    const user = userEvent.setup();
    open();
    await fillBasket(user);

    // BR-23: a pipe brings its gasket. The clerk must see it before committing.
    await waitFor(() => expect(screen.getByText(/EPDM Gasket/)).toBeInTheDocument());
    // Badged as something the rule added, sitting under the pipe that brought
    // it rather than adrift in the totals panel.
    expect(screen.getByText('Included')).toBeInTheDocument();
  });

  it('asks for the quote on the date the sale will carry, since bundle rules are versioned', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);

    await waitFor(() => {
      const quoteCall = apiClient.post.mock.calls.find(([url]) => url.includes('/quote'));
      expect(quoteCall[1].invoiceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
  it('names the factory as the missing field, not the item already added', async () => {
    // Two plants, so nothing is auto-selected and the dialog genuinely starts
    // without a factory.
    apiClient.get.mockImplementation((url) => {
      if (url.includes('factories')) {
        return Promise.resolve(listResponse([
          { id: 'f1', name: 'Bhuasuni Plant' },
          { id: 'f2', name: 'Cuttack Plant' },
        ]));
      }
      if (url.includes('parties')) return Promise.resolve(listResponse([{ id: 'c1', name: 'Ctr Contractor' }]));
      return Promise.resolve(listResponse([]));
    });

    const user = userEvent.setup();
    open();
    // An item, but no factory — which is what a fresh dialog looks like once
    // someone starts typing. The panel used to say "Add an item to see the
    // total" here, sending the user to do the one thing they had already done.
    await user.click(screen.getByTestId('pick-product'));
    await user.type(screen.getByPlaceholderText('Qty'), '10');

    expect(await screen.findByText(/Select a factory to price this sale/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add an item to see the total/i)).not.toBeInTheDocument();
    // And nothing was asked of the server, because it could not be priced.
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('chooses the only plant there is, rather than refusing to price until asked', async () => {
    const user = userEvent.setup();
    open();
    // One factory in the list: nothing to choose, so the dialog should not sit
    // there declining to price a basket over a decision with one option.
    await user.click(screen.getByTestId('pick-product'));
    await user.type(screen.getByPlaceholderText('Qty'), '10');

    await waitFor(() => expect(screen.getByText('₹11,800.00')).toBeInTheDocument());
    expect(screen.getByLabelText('Factory')).toHaveValue('f1');
  });
  /** A quote carrying one parent line and the accessory its rule attached. */
  const withAccessory = () =>
    apiClient.post.mockImplementation((url) => {
      if (url.includes('/quote')) {
        return Promise.resolve({
          data: {
            data: {
              ...QUOTE,
              lines: [
                { productId: 'prod-1', productName: 'RCP 600mm', quantity: 2, ratePaise: 500000, lineTotalPaise: 1180000, bundleParentProductId: null },
                { productId: 'acc-1', productName: 'EPDM Gasket', quantity: 2, ratePaise: 20000, lineTotalPaise: 47200, bundleParentProductId: 'prod-1' },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: { invoice: {}, customer: {} } } });
    });

  it('sends a re-typed accessory quantity as an override', async () => {
    withAccessory();
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByLabelText('EPDM Gasket quantity')).toBeInTheDocument());

    await user.type(screen.getByLabelText('EPDM Gasket quantity'), '5');

    await waitFor(() => {
      const last = apiClient.post.mock.calls.filter(([u]) => u.includes('/quote')).pop();
      expect(last[1].lines[0].accessoryOverrides).toEqual([{ componentProductId: 'acc-1', qty: '5' }]);
    });
  });

  it('will not remove an accessory without a reason', async () => {
    withAccessory();
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByLabelText('Remove EPDM Gasket')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Remove EPDM Gasket'));
    // A reason must be chosen; the prompt defaults to one that needs no note,
    // so clear it to prove the guard rather than the default.
    await user.selectOptions(screen.getByLabelText('Removal reason'), 'OTHER');
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText(/needs a note/i)).toBeInTheDocument();
    // Still on the sale.
    expect(screen.getByLabelText('EPDM Gasket quantity')).toBeInTheDocument();
  });

  it('removes with a reason, and keeps a way back', async () => {
    withAccessory();
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByLabelText('Remove EPDM Gasket')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Remove EPDM Gasket'));
    await user.selectOptions(screen.getByLabelText('Removal reason'), 'NOT_NEEDED');
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    // The override reaches the server with its reason attached.
    await waitFor(() => {
      const last = apiClient.post.mock.calls.filter(([u]) => u.includes('/quote')).pop();
      expect(last[1].lines[0].accessoryOverrides[0]).toMatchObject({
        componentProductId: 'acc-1', removed: true, reasonCode: 'NOT_NEEDED',
      });
    });

    // A mistaken removal is one click back, not a restarted sale.
    expect(screen.getByLabelText('Restore EPDM Gasket')).toBeInTheDocument();
    expect(screen.getByText(/Removed — Customer does not want it/)).toBeInTheDocument();
  });

  it('restores a removed accessory by dropping the override entirely', async () => {
    withAccessory();
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByLabelText('Remove EPDM Gasket')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Remove EPDM Gasket'));
    await user.selectOptions(screen.getByLabelText('Removal reason'), 'NOT_NEEDED');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getByLabelText('Restore EPDM Gasket')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Restore EPDM Gasket'));

    await waitFor(() => {
      const last = apiClient.post.mock.calls.filter(([u]) => u.includes('/quote')).pop();
      // No override at all — back to whatever the bundle rule says.
      expect(last[1].lines[0].accessoryOverrides).toBeUndefined();
    });
  });

  it('lets the clerk back out of a removal without changing anything', async () => {
    withAccessory();
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByLabelText('Remove EPDM Gasket')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Remove EPDM Gasket'));
    await user.click(screen.getByRole('button', { name: 'Keep it' }));

    expect(screen.queryByLabelText('Removal reason')).not.toBeInTheDocument();
    expect(screen.getByLabelText('EPDM Gasket quantity')).toBeInTheDocument();
  });
  it('sends the discount with the line, and shows what it took off', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url.includes('/quote')) {
        return Promise.resolve({
          data: { data: { ...QUOTE, discountPaise: 100000, subtotalPaise: 900000, totalPaise: 1062000 } },
        });
      }
      return Promise.resolve({ data: { data: { invoice: {}, customer: {} } } });
    });

    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await user.type(screen.getByLabelText('Discount percent'), '10');

    await waitFor(() => {
      const last = apiClient.post.mock.calls.filter(([u]) => u.includes('/quote')).pop();
      expect(last[1].lines[0].discountPercent).toBe(10);
    });

    // Named on the summary, because "what did I knock off?" is the question a
    // clerk is asked out loud.
    expect(await screen.findByText('Discount')).toBeInTheDocument();
    expect(screen.getByText('− ₹1,000.00')).toBeInTheDocument();
  });

  it('sends no discount at all when the box is left empty', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);

    await waitFor(() => {
      const last = apiClient.post.mock.calls.filter(([u]) => u.includes('/quote')).pop();
      // Absent, not zero — the same rule the rate field follows.
      expect(last[1].lines[0]).not.toHaveProperty('discountPercent');
    });
  });

  it('hides the discount row when nothing was given away', async () => {
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByText('₹11,800.00')).toBeInTheDocument());
    expect(screen.queryByText('Discount')).not.toBeInTheDocument();
  });

  it('discounts an accessory on its own row', async () => {
    withAccessory();
    const user = userEvent.setup();
    open();
    await fillBasket(user);
    await waitFor(() => expect(screen.getByLabelText('EPDM Gasket discount percent')).toBeInTheDocument());

    await user.type(screen.getByLabelText('EPDM Gasket discount percent'), '50');

    await waitFor(() => {
      const last = apiClient.post.mock.calls.filter(([u]) => u.includes('/quote')).pop();
      expect(last[1].lines[0].accessoryOverrides).toEqual([
        { componentProductId: 'acc-1', discountPercent: '50' },
      ]);
    });
  });
});

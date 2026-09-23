import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from '@/test/render';

import FinancePage from './FinancePage';
import SalesPage from './SalesPage';
import LedgerPage from './LedgerPage';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

/**
 * The new screens have to be reachable, and only by people who may see them.
 * A tab that appears for someone the API will refuse is a bug the API's 403
 * merely hides.
 */

const user = (permissions) => ({ id: 'u1', email: 'a@b.co', role: 'EMPLOYEE', permissions });
const list = (rows = []) => ({ data: { data: { rows, count: rows.length, page: 1, limit: 10, totalPages: 1 } } });
const item = (data) => ({ data: { data } });

let routes;
const render = (ui) => renderWithQuery(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  routes = {};
  apiClient.get.mockImplementation((url) => {
    const match = Object.keys(routes).sort((a, b) => b.length - a.length).find((key) => String(url).includes(key));
    if (match) return Promise.resolve(routes[match]);
    if (String(url).includes('/auth/me')) return Promise.resolve(item(user(['*'])));
    return Promise.resolve(list([]));
  });
});

const signedInAs = (permissions) => { routes['/auth/me'] = item(user(permissions)); };
const tabNames = async (expected) => {
  await waitFor(() => expect(screen.getByRole('button', { name: expected })).toBeInTheDocument());
};

describe('Finance tabs', () => {
  it('offers the new finance screens to someone who may see them', async () => {
    render(<FinancePage />);
    for (const label of ['Receipts & Payments', 'Ledger', 'Expenses', 'GST Returns', 'Fixed Assets']) {
      await tabNames(label);
    }
  });

  it('hides Fixed Assets from someone without that permission', async () => {
    signedInAs(['PAYMENT_READ']);
    render(<FinancePage />);
    await tabNames('Receipts & Payments');
    expect(screen.queryByRole('button', { name: 'Fixed Assets' })).not.toBeInTheDocument();
  });

  it('says so plainly when a user may see nothing here at all', async () => {
    signedInAs(['PRODUCT_READ']);
    render(<FinancePage />);
    expect(await screen.findByText('Access Restricted')).toBeInTheDocument();
  });
});

describe('Sales tabs', () => {
  it('lists the flow in order: leads, quotations, orders, counter, till', async () => {
    render(<SalesPage />);
    for (const label of ['Leads', 'Quotations', 'Sales Orders', 'Counter Sales', 'Cash Register']) {
      await tabNames(label);
    }
  });

  it('still lands on Sales Orders, as it always did', async () => {
    routes['/sales/orders'] = list([]);
    render(<SalesPage />);
    await waitFor(() => {
      const tab = screen.getByRole('button', { name: 'Sales Orders' });
      expect(tab.className).toMatch(/bg-primary/);
    });
  });

  it('hides Leads and Quotations from someone who may only see invoices', async () => {
    signedInAs(['INVOICE_READ']);
    render(<SalesPage />);
    await tabNames('Counter Sales');
    expect(screen.queryByRole('button', { name: 'Leads' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quotations' })).not.toBeInTheDocument();
  });
});

describe('Ledger tabs', () => {
  it('adds the statements, the chart of accounts and vouchers', async () => {
    routes['/ledger/accounts'] = item([]);
    render(<LedgerPage />);
    for (const label of ['Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Party Ledger', 'Cash Book', 'Chart of Accounts', 'Vouchers']) {
      await tabNames(label);
    }
  });

  it('hides the statements from someone who cannot see amounts', async () => {
    signedInAs(['LEDGER_READ']);
    routes['/ledger/accounts'] = item([]);
    render(<LedgerPage />);
    await tabNames('Trial Balance');
    expect(screen.queryByRole('button', { name: 'Profit & Loss' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Balance Sheet' })).not.toBeInTheDocument();
  });

  it('shows the cash book rows, its opening balance and its closing balance', async () => {
    routes['/ledger/accounts'] = item([
      { id: 'cash', code: '1000', name: 'Cash-in-Hand', subType: 'CASH', isSystem: true, type: 'ASSET', isActive: true },
      { id: 'hdfc', code: '1011', name: 'HDFC', subType: 'BANK', isSystem: false, type: 'ASSET', isActive: true },
    ]);
    routes['/factories'] = list([{ id: 'f1', name: 'Bhuasuni Plant' }]);
    routes['/ledger/cash-book'] = item({
      accountCode: '1000', accountName: 'Cash-in-Hand',
      openingBalancePaise: 100000, closingBalancePaise: 159000, totalInPaise: 59000, totalOutPaise: 0,
      rows: [{ entryId: 'e1', date: '2026-06-02', narration: 'Receipt RCP/0001', referenceType: 'Receipt', debitPaise: 59000, creditPaise: 0, runningBalancePaise: 159000 }],
    });

    const u = userEvent.setup();
    render(<LedgerPage />);
    await u.click(await screen.findByRole('button', { name: 'Cash Book' }));
    await u.selectOptions(await screen.findByLabelText('Factory'), 'f1');  // the Cash Book's own picker

    // The row itself — this table was fed the whole response object before and
    // showed nothing at all.
    expect(await screen.findByText('Receipt RCP/0001')).toBeInTheDocument();
    expect(screen.getByText('₹1,000.00')).toBeInTheDocument();  // opening balance
    // Closing appears twice: in the summary strip and as the row's running balance.
    expect(screen.getAllByText('₹1,590.00')).toHaveLength(2);

    // And a named bank account is offered beside the two system ones.
    expect(within(screen.getByLabelText('Account')).getByRole('option', { name: 'HDFC' })).toBeInTheDocument();
  });
});

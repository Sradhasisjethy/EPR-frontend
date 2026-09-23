import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { ProfitAndLoss, BalanceSheet } from './financial-statements';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

const section = (group, label, accounts) => ({
  group, label, accounts, totalPaise: accounts.reduce((s, a) => s + a.amountPaise, 0),
});

const PL = {
  from: '2026-04-01',
  to: '2026-09-18',
  trading: {
    openingStockPaise: 500000,
    directExpense: section('DIRECT_EXPENSE', 'Purchases & Direct Expenses', [{ accountId: 'p', name: 'Purchase Expense', amountPaise: 1000000 }]),
    directIncome: section('DIRECT_INCOME', 'Sales & Direct Income', [
      { accountId: 's', name: 'Sales Revenue', amountPaise: 60000 },
      { accountId: 'r', name: 'Sales Return', amountPaise: -10000 },
    ]),
    closingStockPaise: 1630000,
    grossProfitPaise: 180000,
  },
  indirectIncome: section('INDIRECT_INCOME', 'Other Income', []),
  indirectExpense: section('INDIRECT_EXPENSE', 'Indirect Expenses', [{ accountId: 'f', name: 'Factory Expenses', amountPaise: 5000 }]),
  netProfitPaise: 175000,
  stockValuation: { basis: 'STANDARD_COST', unvaluedProducts: 2 },
};

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.get.mockImplementation((url) => {
    if (url.includes('factories')) return Promise.resolve({ data: { data: { rows: [{ id: 'f1', name: 'Bhuasuni Plant' }] } } });
    if (url.includes('profit-and-loss')) return Promise.resolve({ data: { data: PL } });
    if (url.includes('balance-sheet')) {
      return Promise.resolve({ data: { data: {
        asOf: '2026-09-18',
        assets: [section('CURRENT_ASSET', 'Current Assets', [{ accountId: 'c', name: 'Cash-in-Hand', amountPaise: 100 }])],
        liabilities: [],
        capital: [section('RESERVES', 'Reserves & Surplus', [{ accountId: null, name: 'Profit & Loss Account', amountPaise: 90 }])],
        totalAssetsPaise: 100,
        totalLiabilitiesAndCapitalPaise: 90,
        differencePaise: 10,
        stockValuation: { basis: 'STANDARD_COST', unvaluedProducts: 0 },
      } } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
});

describe('ProfitAndLoss', () => {
  it('lays out the trading account and the net result', async () => {
    renderWithQuery(<ProfitAndLoss />);
    expect(await screen.findByText('Net profit')).toBeInTheDocument();
    expect(screen.getByText('Opening stock')).toBeInTheDocument();
    expect(screen.getByText('Closing stock')).toBeInTheDocument();
    expect(screen.getByText('Gross profit')).toBeInTheDocument();
    expect(screen.getByText('₹1,750.00')).toBeInTheDocument();
    // A contra line (returns) reads as a negative inside income.
    expect(screen.getByText('-₹100.00')).toBeInTheDocument();
  });

  it('says which products could not be valued', async () => {
    renderWithQuery(<ProfitAndLoss />);
    expect(await screen.findByText(/2 product\(s\) in stock have no standard cost/)).toBeInTheDocument();
  });

  it('asks the server for a range only once both ends are set', async () => {
    const user = userEvent.setup();
    renderWithQuery(<ProfitAndLoss />);
    await screen.findByText('Net profit');
    await user.type(screen.getByLabelText('From'), '2026-05-01');
    const calls = () => apiClient.get.mock.calls.filter(([u]) => u.includes('profit-and-loss'));
    expect(calls().every(([, cfg]) => !cfg.params.from)).toBe(true);
    await user.type(screen.getByLabelText('To'), '2026-05-31');
    await waitFor(() => expect(calls().some(([, cfg]) => cfg.params.from === '2026-05-01' && cfg.params.to === '2026-05-31')).toBe(true));
  });
});

describe('BalanceSheet', () => {
  it('flags sides that do not agree instead of hiding it', async () => {
    renderWithQuery(<BalanceSheet />);
    expect(await screen.findByRole('alert')).toHaveTextContent('The two sides differ by ₹0.10');
  });
});

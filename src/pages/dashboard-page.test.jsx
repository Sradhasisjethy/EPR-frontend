import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from '@/test/render';
import DashboardPage from './DashboardPage';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

// The charts are lazy-loaded and recharts needs layout the jsdom container does
// not have; the tabs and figures are what these tests are about.
vi.mock('@/components/dashboard/charts', () => ({
  TrendArea: () => <div data-testid="trend-area" />,
  YieldDonut: () => <div data-testid="yield-donut" />,
  PipelineBars: () => <div data-testid="pipeline-bars" />,
}));

const OPERATIONAL = {
  productionToday: 90, productionMTD: 90, dispatchesToday: 1, pendingOrders: 3,
  curingLots: 2, deadStockLots: 0, slowMovingLots: 0, pendingVarianceApprovals: 0,
  unreadAlerts: 1, yieldPercent: 96.5, rejectionPercent: 3.5,
  curingCompletingThisWeek: [], reorderAlerts: [],
};

const FINANCIAL = {
  salesTodayPaise: 0, salesMTDPaise: 10620000, purchaseMTDPaise: 0,
  cashBalancePaise: 500000, bankBalancePaise: 0,
  receivablesPaise: 10620000,
  receivablesAgeing: { notDue: 10620000, d1_30: 0, d31_60: 0, d61_90: 0, d90Plus: 0 },
  payablesPaise: 0, deadStockValuePaise: 0, inventoryValuePaise: 4000000, deadStockPercent: 0,
  cashByFactory: [],
};

const SALES = {
  pipeline: [{ status: 'DISPATCHED', count: 1 }],
  topCustomers: [{ partyId: 'p1', name: 'Odisha Rural Works', totalPaise: 10620000, invoices: 1 }],
};

const respond = ({ financial } = {}) => {
  apiClient.get.mockImplementation((url) => {
    // Other hooks on the page fetch too; only the dashboard call is shaped here.
    if (String(url ?? '').includes('/dashboard')) {
      return Promise.resolve({
        data: {
          data: {
            operational: OPERATIONAL,
            trends: [{ month: '2026-09', production: 90, salesPaise: 10620000 }],
            ...(financial ? { financial: FINANCIAL, sales: SALES } : {}),
          },
        },
      });
    }
    return Promise.resolve({ data: { data: { rows: [], count: 0 } } });
  });
};

const render = () => renderWithQuery(<MemoryRouter><DashboardPage /></MemoryRouter>);

/**
 * The Sales tab is the financial half of the dashboard. AC-14.1 says that half
 * is not merely hidden for a user without VIEW_RATES — the API does not compute
 * it, so the tab must not exist rather than render empty.
 */
describe('DashboardPage', () => {
  beforeEach(() => apiClient.get.mockReset());

  it('shows production figures to everyone', async () => {
    respond({ financial: false });
    render();
    await waitFor(() => expect(screen.getByText('Produced today')).toBeInTheDocument());
    expect(screen.getByText('96.5%')).toBeInTheDocument();
  });

  it('offers no Sales tab when the API returned no financial data', async () => {
    respond({ financial: false });
    render();
    await waitFor(() => expect(screen.getByText('Produced today')).toBeInTheDocument());
    // Not hidden behind a click — absent.
    expect(screen.queryByRole('button', { name: 'Sales' })).not.toBeInTheDocument();
  });

  it('offers the Sales tab when the financial half is present', async () => {
    respond({ financial: true });
    render();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sales' })).toBeInTheDocument());
  });

  it('switches to sales figures on the Sales tab', async () => {
    respond({ financial: true });
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', { name: 'Sales' }));

    expect(screen.getByText('Net sales today')).toBeInTheDocument();
    expect(screen.getByText('Top customers this month')).toBeInTheDocument();
    expect(screen.getByText('Odisha Rural Works')).toBeInTheDocument();
    // The production tiles belong to the other tab.
    expect(screen.queryByText('Produced today')).not.toBeInTheDocument();
  });
});

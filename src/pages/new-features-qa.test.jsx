import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQuery } from '@/test/render';
import { today } from '@/lib/date-format';

import FixedAssetsPage from './FixedAssetsPage';
import CashRegisterPage from './CashRegisterPage';
import QuotationsPage from './QuotationsPage';
import LeadsPage from './LeadsPage';
import StaffLeavePage from './StaffLeavePage';
import StaffAttendancePage from './StaffAttendancePage';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

/**
 * End-to-end checks on the screens added for the feature-gap work, driven the
 * way someone uses them.
 *
 * Two properties are checked on every page, because they are the two that go
 * wrong silently: money is hidden from a user without VIEW_RATES, and an
 * action a user has no permission for is not offered at all.
 */

const ALL = ['*'];
const user = (permissions = ALL) => ({
  id: 'u1', email: 'a@b.co', firstName: 'Asha', lastName: 'Admin', role: 'EMPLOYEE', permissions,
});

const list = (rows) => ({ data: { data: { rows, count: rows.length, page: 1, limit: 10, totalPages: 1 } } });
const item = (data) => ({ data: { data } });

let routes;
const render = (ui) => renderWithQuery(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.put.mockReset();
  routes = {};
  apiClient.get.mockImplementation((url, config) => {
    // Longest key first: /quotations/q1 must not be served by the /quotations list.
    const match = Object.keys(routes).sort((a, b) => b.length - a.length).find((key) => String(url).includes(key));
    if (match) {
      const value = routes[match];
      return Promise.resolve(typeof value === 'function' ? value(config) : value);
    }
    if (String(url).includes('/auth/me')) return Promise.resolve(item(user()));
    return Promise.resolve(list([]));
  });
  apiClient.post.mockResolvedValue(item({}));
  apiClient.put.mockResolvedValue(item({}));
});

const signedInAs = (permissions) => { routes['/auth/me'] = item(user(permissions)); };

// ---------------------------------------------------------------------------

describe('Fixed Assets page', () => {
  const MOULD = {
    id: 'a1', assetNumber: 'FA/BBSR/0001', name: 'RCC Pipe Mould 600mm', category: 'Moulds',
    putToUseDate: '2026-04-01', method: 'SLM', usefulLifeMonths: 24, ratePercent: null,
    costPaise: 1200000, accumulatedDepreciationPaise: 98630, bookValuePaise: 1101370,
    depreciatedUpTo: '2026-04-30', status: 'ACTIVE',
  };
  const TRUCK = {
    ...MOULD, id: 'a2', assetNumber: 'FA/BBSR/0002', name: 'Tata Truck', method: 'WDV', usefulLifeMonths: null, ratePercent: 15,
    costPaise: 1000000, accumulatedDepreciationPaise: 400000, bookValuePaise: 600000, status: 'DISPOSED',
  };

  beforeEach(() => { routes['/fixed-assets'] = list([MOULD, TRUCK]); });

  it('shows cost, depreciation and book value, and how each asset depreciates', async () => {
    render(<FixedAssetsPage />);
    expect(await screen.findByText('RCC Pipe Mould 600mm')).toBeInTheDocument();
    expect(screen.getByText('₹12,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹11,013.70')).toBeInTheDocument();
    expect(screen.getByText('Straight line · 2 yrs')).toBeInTheDocument();
    expect(screen.getByText('WDV · 15%')).toBeInTheDocument();
  });

  it('hides every money column from someone who may not see rates', async () => {
    signedInAs(['FIXED_ASSET_READ']);
    render(<FixedAssetsPage />);
    expect(await screen.findByText('RCC Pipe Mould 600mm')).toBeInTheDocument();
    expect(screen.queryByText('₹12,000.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Register asset/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run depreciation/ })).not.toBeInTheDocument();
  });

  it('offers Dispose on an asset in use but not on one already disposed', async () => {
    render(<FixedAssetsPage />);
    const mouldRow = (await screen.findByText('RCC Pipe Mould 600mm')).closest('tr');
    expect(within(mouldRow).getByRole('button', { name: 'Dispose' })).toBeInTheDocument();
    const truckRow = screen.getByText('Tata Truck').closest('tr');
    expect(within(truckRow).queryByRole('button', { name: 'Dispose' })).not.toBeInTheDocument();
  });

  it('previews a depreciation run before anything posts', async () => {
    routes['/factories'] = list([{ id: 'f1', name: 'Bhuasuni Plant' }]);
    routes['/fixed-assets/depreciation/preview'] = item({
      totalPaise: 106027,
      lines: [{ assetId: 'a1', assetNumber: 'FA/BBSR/0001', name: 'Mould', method: 'SLM', fromDate: '2026-05-01', days: 31, amountPaise: 106027 }],
    });
    const u = userEvent.setup();
    render(<FixedAssetsPage />);
    await u.click(await screen.findByRole('button', { name: /Run depreciation/ }));
    expect(await screen.findByText(/FA\/BBSR\/0001 · Mould/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post ₹1,060.27' })).toBeEnabled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe('Cash Register page', () => {
  const OPEN_SESSION = {
    id: 's1', sessionNumber: 'CS/BBSR/0001', status: 'OPEN', openedAt: '2026-09-22T03:30:00.000Z',
    openingCountedPaise: 200000, totalInPaise: 59000, totalOutPaise: 10000, expectedNowPaise: 249000,
  };

  beforeEach(() => { routes['/factories'] = list([{ id: 'f1', name: 'Bhuasuni Plant' }]); });

  it('says no till is open and offers to open one', async () => {
    routes['/cash-register/sessions/current'] = item(null);
    routes['/cash-register/sessions'] = list([]);
    render(<CashRegisterPage />);
    expect(await screen.findByText('No till is open at this factory.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open till/ })).toBeInTheDocument();
  });

  it('shows what the open drawer should hold and offers to close it', async () => {
    routes['/cash-register/sessions/current'] = item(OPEN_SESSION);
    routes['/cash-register/sessions'] = list([OPEN_SESSION]);
    render(<CashRegisterPage />);
    expect(await screen.findByText('Till open · CS/BBSR/0001')).toBeInTheDocument();
    expect(screen.getByText('₹2,490.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close till/ })).toBeInTheDocument();
  });

  it('keeps the drawer figures from a user who may not see rates', async () => {
    signedInAs(['CASH_REGISTER_READ']);
    routes['/cash-register/sessions/current'] = item(OPEN_SESSION);
    routes['/cash-register/sessions'] = list([OPEN_SESSION]);
    render(<CashRegisterPage />);
    expect(await screen.findByText('Till open · CS/BBSR/0001')).toBeInTheDocument();
    expect(screen.queryByText('₹2,490.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close till/ })).not.toBeInTheDocument();
  });

  it('reports a closed session as short or over, and whether it was written off', async () => {
    routes['/cash-register/sessions/current'] = item(null);
    routes['/cash-register/sessions'] = list([{
      id: 's0', sessionNumber: 'CS/BBSR/0000', status: 'CLOSED', openedAt: '2026-09-21T03:30:00.000Z', closedAt: '2026-09-21T12:30:00.000Z',
      openingCountedPaise: 0, closingCountedPaise: 48000, closingVariancePaise: -1000, varianceAdjusted: true,
    }]);
    render(<CashRegisterPage />);
    expect(await screen.findByText('₹10.00 short')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------

describe('Quotations page', () => {
  const QUOTE = {
    id: 'q1', quotationNumber: 'QT/BBSR/0001', buyerName: 'Konark Builders', quotationDate: '2026-09-01',
    validUntil: '2026-12-31', totalPaise: 53100, status: 'SENT', isExpired: false,
  };

  it('lists quotations with their stage and total', async () => {
    routes['/quotations'] = list([QUOTE]);
    render(<QuotationsPage />);
    expect(await screen.findByText('QT/BBSR/0001')).toBeInTheDocument();
    expect(screen.getByText('Konark Builders')).toBeInTheDocument();
    expect(screen.getByText('₹531.00')).toBeInTheDocument();
    const row = screen.getByText('QT/BBSR/0001').closest('tr');
    expect(within(row).getByText('Sent')).toBeInTheDocument();
  });

  it('marks an out-of-date quotation as expired whatever its stored status says', async () => {
    routes['/quotations'] = list([{ ...QUOTE, isExpired: true }]);
    render(<QuotationsPage />);
    const row = (await screen.findByText('QT/BBSR/0001')).closest('tr');
    expect(within(row).getByText('Expired')).toBeInTheDocument();
    expect(within(row).queryByText('Sent')).not.toBeInTheDocument();
  });

  it('opens the detail, where converting is offered but an expired quote is not convertible', async () => {
    routes['/quotations'] = list([{ ...QUOTE, isExpired: true }]);
    routes['/quotations/q1'] = item({
      ...QUOTE, isExpired: true, factoryId: 'f1', discountPaise: 0, subtotalPaise: 45000,
      cgstPaise: 4050, sgstPaise: 4050, igstPaise: 0, roundOffPaise: 0,
      lines: [{ id: 'l1', productId: 'p1', product: { name: 'Paver' }, quantity: 10, ratePaise: 5000, discountPercent: 10, taxableAmountPaise: 45000 }],
    });
    const u = userEvent.setup();
    render(<QuotationsPage />);
    await u.click(await screen.findByRole('button', { name: 'QT/BBSR/0001' }));
    expect(await screen.findByText(/This quotation has expired/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Convert to sales order/ })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------

describe('Leads page', () => {
  const LEAD = {
    id: 'l1', leadNumber: 'LD/0001', name: 'Konark Infra', contactName: 'Bikash', phone: '9861234567',
    source: 'SITE_VISIT', estimatedValuePaise: 25000000, expectedCloseDate: '2026-11-30',
    ownerName: 'Sunil Sales', status: 'CONTACTED', isOpen: true,
  };
  const PIPELINE = {
    stages: [
      { status: 'NEW', count: 2, valuePaise: 100000 },
      { status: 'CONTACTED', count: 1, valuePaise: 25000000 },
      { status: 'QUALIFIED', count: 0, valuePaise: 0 },
      { status: 'QUOTED', count: 0, valuePaise: 0 },
      { status: 'WON', count: 3, valuePaise: 0 },
      { status: 'LOST', count: 1, valuePaise: 5000000 },
    ],
    openCount: 3, openValuePaise: 25100000,
  };

  beforeEach(() => {
    routes['/crm/leads'] = list([LEAD]);
    routes['/crm/pipeline'] = item(PIPELINE);
  });

  it('shows the pipeline by stage and the leads under it', async () => {
    render(<LeadsPage />);
    expect(await screen.findByRole('button', { name: /Konark Infra/ })).toBeInTheDocument();
    const row = screen.getByRole('button', { name: /Konark Infra/ }).closest('tr');
    expect(within(row).getByText('Contacted')).toBeInTheDocument();
    // The same figure appears on the Contacted pipeline card, so scope to the row.
    expect(within(row).getByText('₹2,50,000.00')).toBeInTheDocument();
  });

  it('filters the list when a stage is clicked, and clears it when clicked again', async () => {
    const u = userEvent.setup();
    render(<LeadsPage />);
    await screen.findByRole('button', { name: /Konark Infra/ });

    await u.click(screen.getByRole('button', { name: /New\s*2/ }));
    await waitFor(() => {
      const call = apiClient.get.mock.calls.filter(([url]) => String(url).includes('/crm/leads')).at(-1);
      expect(call[1].params.status).toBe('NEW');
    });

    await u.click(screen.getByRole('button', { name: /New\s*2/ }));
    await waitFor(() => {
      const call = apiClient.get.mock.calls.filter(([url]) => String(url).includes('/crm/leads')).at(-1);
      expect(call[1].params.status).toBeUndefined();
    });
  });

  it('warns about overdue follow-ups', async () => {
    routes['/crm/tasks'] = item([
      { id: 't1', subject: 'Send the rate list', dueDate: '2026-09-01', isOverdue: true, lead: { id: 'l1', name: 'Konark Infra' } },
      { id: 't2', subject: 'Call back', dueDate: '2026-12-01', isOverdue: false, lead: { id: 'l1', name: 'Konark Infra' } },
    ]);
    render(<LeadsPage />);
    expect(await screen.findByText(/1 follow-up overdue/)).toBeInTheDocument();
    expect(screen.queryByText(/Call back/)).not.toBeInTheDocument();
  });

  it('hides what a lead is worth from a user without rates', async () => {
    signedInAs(['LEAD_READ']);
    render(<LeadsPage />);
    expect(await screen.findByRole('button', { name: /Konark Infra/ })).toBeInTheDocument();
    expect(screen.queryByText('₹2,50,000.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New lead/ })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------

describe('Staff Leave page', () => {
  const REQUEST = {
    id: 'r1', employee: { firstName: 'Raju', lastName: 'Clerk' }, leaveType: { name: 'Casual Leave' },
    fromDate: '2026-10-05', toDate: '2026-10-07', days: 3, reason: 'Family function', status: 'PENDING',
  };

  beforeEach(() => {
    routes['/hr/leave-requests'] = list([REQUEST]);
    routes['/hr/leave-types'] = item([{ id: 'lt1', code: 'CL', name: 'Casual Leave', daysPerYear: 12, isPaid: true }]);
    routes['/users'] = list([{ id: 'e1', firstName: 'Raju', lastName: 'Clerk' }]);
  });

  it('lists requests with who they are for and how many days', async () => {
    render(<StaffLeavePage />);
    const cell = await screen.findByText('Family function');
    const row = cell.closest('tr');
    expect(within(row).getByText('Raju Clerk')).toBeInTheDocument();
    expect(within(row).getByText('Pending')).toBeInTheDocument();
  });

  it('offers approve and reject only to someone who may approve', async () => {
    render(<StaffLeavePage />);
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();

    cleanup();
    signedInAs(['LEAVE_READ', 'LEAVE_CREATE']);
    render(<StaffLeavePage />);
    await screen.findByText('Family function');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows a balance with what is left', async () => {
    routes['/hr/leave-balances'] = item({
      employeeId: 'e1', leaveYear: '2026-27',
      balances: [{ leaveTypeId: 'lt1', code: 'CL', name: 'Casual Leave', allowedDays: 12, takenDays: 3, pendingDays: 1.5, remainingDays: 9 }],
    });
    const u = userEvent.setup();
    render(<StaffLeavePage />);
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'Raju Clerk' }).length).toBeGreaterThan(0));
    await u.selectOptions(screen.getByLabelText('Employee balances'), 'e1');
    expect(await screen.findByText('Leave year 2026-27')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------

describe('Staff Attendance page', () => {
  beforeEach(() => {
    routes['/factories'] = list([{ id: 'f1', name: 'Bhuasuni Plant' }]);
    routes['/hr/attendance/roster'] = item({
      date: '2026-10-06',
      rows: [
        { employeeId: 'e1', name: 'Asha Admin', employeeCode: 'EMP-001', attendance: null, approvedLeave: null, suggestedStatus: 'PRESENT' },
        { employeeId: 'e2', name: 'Raju Clerk', employeeCode: 'EMP-002', attendance: null, approvedLeave: { code: 'CL', name: 'Casual Leave' }, suggestedStatus: 'ON_LEAVE' },
      ],
    });
    routes['/hr/attendance/summary'] = item({ from: '2026-10-01', to: '2026-10-06', rows: [] });
  });

  it('pre-fills someone on approved leave instead of marking them present', async () => {
    render(<StaffAttendancePage />);
    expect(await screen.findByLabelText('Status for Raju Clerk')).toHaveValue('ON_LEAVE');
    expect(screen.getByLabelText('Status for Asha Admin')).toHaveValue('PRESENT');
    expect(screen.getByText('Approved Casual Leave')).toBeInTheDocument();
  });

  it('disables the in/out times for anyone not at work', async () => {
    render(<StaffAttendancePage />);
    expect(await screen.findByLabelText('In time for Asha Admin')).toBeEnabled();
    expect(screen.getByLabelText('In time for Raju Clerk')).toBeDisabled();
  });

  it('saves the whole day in one call', async () => {
    const u = userEvent.setup();
    render(<StaffAttendancePage />);
    await u.selectOptions(await screen.findByLabelText('Status for Asha Admin'), 'HALF_DAY');
    await u.click(screen.getByRole('button', { name: /Save attendance/ }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/hr/attendance');
    // The app's own notion of today, not UTC's: after 18:30 UTC they differ.
    expect(body.attendanceDate).toBe(today());
    expect(body.entries).toEqual([
      { employeeId: 'e1', status: 'HALF_DAY' },
      { employeeId: 'e2', status: 'ON_LEAVE' },
    ]);
  });

  it('does not offer saving to someone who may only look', async () => {
    signedInAs(['STAFF_ATTENDANCE_READ']);
    render(<StaffAttendancePage />);
    await waitFor(() => expect(screen.getByLabelText('Status for Asha Admin')).toBeDisabled());
    expect(screen.queryByRole('button', { name: /Save attendance/ })).not.toBeInTheDocument();
  });
});

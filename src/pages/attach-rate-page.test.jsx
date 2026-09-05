import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import AttachRatePage from './AttachRatePage';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('@/hooks/use-auth', () => ({
  useCurrentUser: () => ({ data: { role: 'PLATFORM_ADMIN', permissions: ['ANALYTICS_READ'] } }),
}));

const { apiClient } = await import('@/lib/api-client');

const report = (overrides = {}) => ({
  groupBy: 'product',
  rows: [
    {
      key: 'gasket', label: 'EPDM Rubber Gasket 600mm',
      offered: 10, attached: 3, removed: 7, attachRatePercent: 30,
      reasons: [{ code: 'SITE_HAS_STOCK', label: 'Site already has stock', count: 7 }],
    },
    {
      key: 'hooks', label: 'T-Hooks',
      offered: 8, attached: 8, removed: 0, attachRatePercent: 100, reasons: [],
    },
  ],
  totals: { offered: 18, attached: 11, removed: 7 },
  ...overrides,
});

const respondWith = (data) =>
  apiClient.get.mockImplementation((url = '') =>
    Promise.resolve({
      data: { data: String(url).includes('factories') ? { rows: [{ id: 'f1', name: 'Bhuasuni Plant' }], count: 1 } : data },
    })
  );

beforeEach(() => apiClient.get.mockReset());

describe('AttachRatePage', () => {
  it('reports what was offered against what survived', async () => {
    respondWith(report());
    renderWithQuery(<AttachRatePage />);

    expect(await screen.findByText('EPDM Rubber Gasket 600mm')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows the reasons, which are the point of the report', async () => {
    respondWith(report());
    renderWithQuery(<AttachRatePage />);

    // "30% attach rate" is a number; "7 said the site already had stock" is
    // something a business can act on.
    expect(await screen.findByText(/Site already has stock/)).toBeInTheDocument();
  });

  it('summarises the whole range', async () => {
    respondWith(report());
    renderWithQuery(<AttachRatePage />);

    await screen.findByText('EPDM Rubber Gasket 600mm');
    expect(screen.getByText('18')).toBeInTheDocument();   // offered
    expect(screen.getByText('11')).toBeInTheDocument();   // went out
    expect(screen.getByText('61.1%')).toBeInTheDocument();
  });

  it('asks the server for a different grouping rather than re-slicing locally', async () => {
    const user = userEvent.setup();
    respondWith(report());
    renderWithQuery(<AttachRatePage />);

    await screen.findByText('EPDM Rubber Gasket 600mm');
    await user.selectOptions(screen.getByLabelText('Group by'), 'location');

    const call = apiClient.get.mock.calls.reverse().find(([url]) => String(url).includes('attach-rate'));
    expect(call[1].params).toMatchObject({ groupBy: 'location' });
  });

  it('says plainly when no orders in the range carried a bundle', async () => {
    respondWith(report({ rows: [], totals: { offered: 0, attached: 0, removed: 0 } }));
    renderWithQuery(<AttachRatePage />);

    expect(await screen.findByText(/Nothing to report yet/)).toBeInTheDocument();
  });

  it('always sends a date range, since the endpoint refuses without one', async () => {
    respondWith(report());
    renderWithQuery(<AttachRatePage />);

    await screen.findByText('EPDM Rubber Gasket 600mm');
    const call = apiClient.get.mock.calls.find(([url]) => String(url).includes('attach-rate'));
    expect(call[1].params.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(call[1].params.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not send an empty plant filter as a filter', async () => {
    respondWith(report());
    renderWithQuery(<AttachRatePage />);

    await screen.findByText('EPDM Rubber Gasket 600mm');
    const call = apiClient.get.mock.calls.find(([url]) => String(url).includes('attach-rate'));
    // An empty string would fail the uuid check and return 400 rather than
    // "all plants".
    expect(call[1].params).not.toHaveProperty('factoryId');
  });
});

describe('AttachRatePage without the analytics permission', () => {
  it('refuses rather than showing an empty report', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/use-auth', () => ({
      useCurrentUser: () => ({ data: { role: 'EMPLOYEE', permissions: [] } }),
    }));
    const { default: Restricted } = await import('./AttachRatePage');

    renderWithQuery(<Restricted />);
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });
});

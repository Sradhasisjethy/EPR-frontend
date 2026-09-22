import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { AssetFormDialog } from './asset-form-dialog';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.get.mockImplementation((url) => {
    if (url.includes('factories')) return Promise.resolve({ data: { data: { rows: [{ id: 'f1', name: 'Bhuasuni Plant' }] } } });
    return Promise.resolve({ data: { data: [] } });
  });
  apiClient.post.mockResolvedValue({ data: { data: { assetNumber: 'FA/BBSR/0001' } } });
});

const fillCommon = async (user) => {
  await waitFor(() => expect(screen.getByLabelText('Factory')).toHaveValue('f1'));
  await user.type(screen.getByLabelText('Asset name'), 'Pipe Mould');
  await user.type(screen.getByLabelText('Cost (₹)'), '120000');
};

describe('AssetFormDialog', () => {
  it('sends a straight-line purchase with its life in months and how it was paid', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AssetFormDialog open onOpenChange={() => {}} />);
    await fillCommon(user);
    await user.type(screen.getByLabelText('Useful life (years)'), '2.5');
    expect(screen.getByText('About ₹48,000.00 a year.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Register asset' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const body = apiClient.post.mock.calls[0][1];
    expect(body).toMatchObject({
      acquisitionType: 'PURCHASED', method: 'SLM', usefulLifeMonths: 30, costPaise: 12000000, payment: { mode: 'BANK' },
    });
    expect(body).not.toHaveProperty('openingAccumulatedPaise');
  });

  it('sends an already-owned WDV asset with its prior depreciation and no payment', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AssetFormDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole('radio', { name: 'Already owned (go-live)' }));
    await user.click(screen.getByRole('radio', { name: 'Written-down value' }));
    await fillCommon(user);
    await user.type(screen.getByLabelText('Rate per year (%)'), '15');
    await user.type(screen.getByLabelText('Depreciation already charged (₹)'), '40000');
    expect(screen.queryByRole('radiogroup', { name: 'Paid from' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Register asset' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const body = apiClient.post.mock.calls[0][1];
    expect(body).toMatchObject({ acquisitionType: 'EXISTING', method: 'WDV', ratePercent: 15, openingAccumulatedPaise: 4000000 });
    expect(body).not.toHaveProperty('payment');
  });
});

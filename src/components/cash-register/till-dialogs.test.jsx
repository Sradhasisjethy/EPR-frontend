import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { OpenTillDialog, CloseTillDialog } from './till-dialogs';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

beforeEach(() => {
  apiClient.post.mockReset();
  apiClient.put.mockReset();
  apiClient.post.mockResolvedValue({ data: { data: { sessionNumber: 'CS/BBSR/0001', openingCountedPaise: 250000, openingVariancePaise: 0 } } });
  apiClient.put.mockResolvedValue({ data: { data: { sessionNumber: 'CS/BBSR/0001', closingVariancePaise: -1000 } } });
});

describe('OpenTillDialog', () => {
  it('sends only the denominations actually counted', async () => {
    const user = userEvent.setup();
    renderWithQuery(<OpenTillDialog open onOpenChange={() => {}} factoryId="f1" />);
    await user.type(screen.getByLabelText('Number of 500 rupee notes'), '4');
    await user.type(screen.getByLabelText('Number of 100 rupee notes'), '5');
    expect(screen.getByText('₹2,500.00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open till' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(apiClient.post.mock.calls[0][1]).toMatchObject({ factoryId: 'f1', denominations: { 500: 4, 100: 5 } });
  });
});

describe('CloseTillDialog', () => {
  const SESSION = { id: 's1', sessionNumber: 'CS/BBSR/0001', expectedNowPaise: 49000 };

  it('works out the shortfall against what the books expect', async () => {
    const user = userEvent.setup();
    renderWithQuery(<CloseTillDialog session={SESSION} onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText('Number of 200 rupee notes'), '2');
    await user.type(screen.getByLabelText('Number of 50 rupee notes'), '1');
    await user.type(screen.getByLabelText('Number of 20 rupee notes'), '1');
    await user.type(screen.getByLabelText('Number of 10 rupee notes'), '1');

    expect(screen.getByText('Short by')).toBeInTheDocument();
    expect(screen.getAllByText('₹10.00').length).toBeGreaterThan(0);
  });

  it('only offers the write-off once there is a difference, and defaults it off', async () => {
    const user = userEvent.setup();
    renderWithQuery(<CloseTillDialog session={{ ...SESSION, expectedNowPaise: 50000 }} onOpenChange={() => {}} />);
    // Nothing counted yet: the whole drawer is not a difference to write off.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Number of 500 rupee notes'), '1');
    expect(screen.getByText('Balanced')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Number of 100 rupee notes'), '1');
    expect(screen.getByText('Over by')).toBeInTheDocument();
    const writeOff = screen.getByRole('checkbox');
    expect(writeOff).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Close till' }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
    expect(apiClient.put.mock.calls[0][1]).toMatchObject({ postAdjustment: false, denominations: { 500: 1, 100: 1 } });
  });
});

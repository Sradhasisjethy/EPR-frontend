import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { OfficeFormDialog } from './office-form-dialog';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(() => Promise.resolve({ data: { data: [] } })), post: vi.fn(), put: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

/**
 * The PIN code is the first address field on purpose: it fills city, state and
 * country, so the only thing left to type is the street.
 */
describe('OfficeFormDialog address fields', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { Status: 'Success', PostOffice: [{ District: 'Khorda', State: 'Odisha', Country: 'India' }] },
        ]),
      })
    ));
  });
  afterEach(() => vi.unstubAllGlobals());

  const open = () => renderWithQuery(<OfficeFormDialog open onOpenChange={() => {}} />);

  it('puts the PIN code ahead of city and state', () => {
    open();
    const inputs = screen.getAllByRole('textbox');
    const order = inputs.map((i) => i.id).filter((id) =>
      ['office-pincode', 'office-city', 'office-state', 'office-country'].includes(id)
    );
    // Whatever else sits between them, PIN must come before city and state.
    expect(order.indexOf('office-pincode')).toBeLessThan(order.indexOf('office-city'));
    expect(order.indexOf('office-pincode')).toBeLessThan(order.indexOf('office-state'));
  });

  it('fills city, state and country from the PIN code', async () => {
    const user = userEvent.setup();
    open();

    await user.type(screen.getByLabelText(/Pincode/i), '751007');

    await waitFor(() => expect(screen.getByLabelText(/^City/i)).toHaveValue('Khorda'), { timeout: 3000 });
    expect(screen.getByLabelText(/^State/i)).toHaveValue('Odisha');
    expect(screen.getByLabelText(/^Country/i)).toHaveValue('India');
  });

  it('leaves the fields alone and typeable when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const user = userEvent.setup();
    open();

    await user.type(screen.getByLabelText(/Pincode/i), '751007');
    await waitFor(() => expect(screen.getByText(/lookup unavailable/i)).toBeInTheDocument(), { timeout: 3000 });

    // An address the service cannot resolve is still a real address.
    await user.type(screen.getByLabelText(/^City/i), 'Bhubaneswar');
    expect(screen.getByLabelText(/^City/i)).toHaveValue('Bhubaneswar');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { AccountFormDialog } from './account-form-dialog';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const GROUPS = [
  { key: 'CURRENT_ASSET', type: 'ASSET', label: 'Current Assets' },
  { key: 'FIXED_ASSET', type: 'ASSET', label: 'Fixed Assets' },
  { key: 'CURRENT_LIABILITY', type: 'LIABILITY', label: 'Current Liabilities' },
  { key: 'INDIRECT_EXPENSE', type: 'EXPENSE', label: 'Indirect Expenses' },
];

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.put.mockReset();
  apiClient.get.mockImplementation((url) => {
    if (url.includes('account-groups')) return Promise.resolve({ data: { data: GROUPS } });
    if (url.includes('factories')) return Promise.resolve({ data: { data: { rows: [{ id: 'f1', name: 'Bhuasuni Plant' }], count: 1 } } });
    return Promise.resolve({ data: { data: [] } });
  });
  apiClient.post.mockResolvedValue({ data: { data: { id: 'new' } } });
  apiClient.put.mockResolvedValue({ data: { data: { id: 'x' } } });
});

const waitForGroups = () => waitFor(() => expect(screen.getByRole('option', { name: 'Current Assets' })).toBeInTheDocument());

describe('AccountFormDialog', () => {
  it('adds a bank account with its bank details and opening balance', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AccountFormDialog open onOpenChange={() => {}} preset={{ accountGroup: 'CURRENT_ASSET', subType: 'BANK' }} />);
    await waitForGroups();

    expect(screen.getByRole('heading', { name: 'Add Bank Account' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Code'), '1011');
    await user.type(screen.getByLabelText('Name'), 'HDFC Current A/c');
    await user.type(screen.getByLabelText('IFSC'), 'hdfc0001234');
    await user.click(screen.getByLabelText('It already has a balance'));
    await waitFor(() => expect(screen.getByLabelText('Factory')).toHaveValue('f1'));
    await user.type(screen.getByLabelText('Balance (₹)'), '500000');
    await user.click(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/ledger/accounts');
    expect(body).toMatchObject({
      code: '1011', name: 'HDFC Current A/c', accountGroup: 'CURRENT_ASSET', subType: 'BANK', ifsc: 'HDFC0001234',
      openingBalance: { factoryId: 'f1', amountPaise: 50000000 },
    });
  });

  it('will not offer "cash" for a liability group', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AccountFormDialog open onOpenChange={() => {}} />);
    await waitForGroups();
    await user.selectOptions(screen.getByLabelText('Group'), 'CURRENT_LIABILITY');
    expect(screen.getByRole('option', { name: 'Cash' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Bank' })).not.toBeDisabled();
  });

  it('drops a money kind the new group cannot hold', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AccountFormDialog open onOpenChange={() => {}} preset={{ accountGroup: 'CURRENT_ASSET', subType: 'CASH' }} />);
    await waitForGroups();
    await user.selectOptions(screen.getByLabelText('Group'), 'CURRENT_LIABILITY');
    expect(screen.getByLabelText('Money account')).toHaveValue('');
  });

  it('only sends bank details when editing a system account', async () => {
    const user = userEvent.setup();
    const bank = {
      id: 'sys-bank', code: '1010', name: 'Bank Account', accountGroup: 'CURRENT_ASSET', subType: 'BANK', isSystem: true,
    };
    renderWithQuery(<AccountFormDialog open onOpenChange={() => {}} account={bank} />);
    await waitForGroups();

    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByLabelText('Group')).toBeDisabled();
    await user.type(screen.getByLabelText('Bank'), 'Axis Bank');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalled());
    const [url, body] = apiClient.put.mock.calls[0];
    expect(url).toBe('/ledger/accounts/sys-bank');
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('accountGroup');
    expect(body.bankName).toBe('Axis Bank');
  });
});

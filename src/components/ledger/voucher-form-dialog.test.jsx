import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { VoucherFormDialog } from './voucher-form-dialog';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ACCOUNTS = [
  { id: 'cash', code: '1000', name: 'Cash-in-Hand', type: 'ASSET', subType: 'CASH', isSystem: true },
  { id: 'hdfc', code: '1011', name: 'HDFC Current A/c', type: 'ASSET', subType: 'BANK', isSystem: false },
  { id: 'ar', code: '1100', name: 'Accounts Receivable', type: 'ASSET', subType: null, isSystem: true, isPartyControlAccount: true },
  { id: 'rent', code: '5910', name: 'Rent', type: 'EXPENSE', subType: null, isSystem: false },
  { id: 'loan', code: '2500', name: 'Loan from Director', type: 'LIABILITY', subType: null, isSystem: false },
];

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.get.mockImplementation((url) => {
    if (url.includes('factories')) return Promise.resolve({ data: { data: { rows: [{ id: 'f1', name: 'Bhuasuni Plant' }], count: 1 } } });
    if (url.includes('/ledger/accounts')) return Promise.resolve({ data: { data: ACCOUNTS } });
    return Promise.resolve({ data: { data: [] } });
  });
  apiClient.post.mockResolvedValue({ data: { data: { voucherNumber: 'JV/BBSR/0001' } } });
});

const waitForAccounts = () => waitFor(() => expect(screen.getAllByRole('option', { name: /HDFC Current/ }).length).toBeGreaterThan(0));

describe('Contra voucher', () => {
  it('offers only cash and bank accounts, and posts to = debit, from = credit', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VoucherFormDialog open onOpenChange={() => {}} voucherType="CONTRA" />);
    await waitForAccounts();

    const from = screen.getByLabelText('From');
    expect([...from.options].map((o) => o.textContent)).not.toContain('Rent');

    // One factory is chosen for you.
    await waitFor(() => expect(screen.getByLabelText('Factory')).toHaveValue('f1'));
    await user.selectOptions(from, 'hdfc');
    await user.selectOptions(screen.getByLabelText('To'), 'cash');
    await user.type(screen.getByLabelText('Amount (₹)'), '20000');
    await user.type(screen.getByLabelText('Narration'), 'Cash withdrawn');
    await user.click(screen.getByRole('button', { name: 'Post voucher' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/ledger/vouchers');
    expect(body.voucherType).toBe('CONTRA');
    expect(body.lines).toEqual([
      { accountId: 'cash', debitPaise: 2000000, creditPaise: 0 },
      { accountId: 'hdfc', debitPaise: 0, creditPaise: 2000000 },
    ]);
  });

  it('will not move money from an account into itself', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VoucherFormDialog open onOpenChange={() => {}} voucherType="CONTRA" />);
    await waitForAccounts();
    await user.selectOptions(screen.getByLabelText('From'), 'hdfc');
    await user.selectOptions(screen.getByLabelText('To'), 'hdfc');
    expect(screen.getByText('From and to must be different accounts.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post voucher' })).toBeDisabled();
  });
});

describe('Journal voucher', () => {
  it('keeps receivable and payable out of the account list', async () => {
    renderWithQuery(<VoucherFormDialog open onOpenChange={() => {}} voucherType="JOURNAL" />);
    await waitForAccounts();
    expect(screen.queryByRole('option', { name: /Accounts Receivable/ })).not.toBeInTheDocument();
  });

  it('shows the difference until debits equal credits, then posts', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VoucherFormDialog open onOpenChange={() => {}} voucherType="JOURNAL" />);
    await waitForAccounts();
    await waitFor(() => expect(screen.getByLabelText('Factory')).toHaveValue('f1'));

    const [first, second] = screen.getAllByRole('combobox').filter((el) => el.id.startsWith('jv-account-'));
    await user.selectOptions(first, 'rent');
    await user.type(screen.getByLabelText('Debit line 1'), '35000');
    await user.selectOptions(second, 'hdfc');
    await user.type(screen.getByLabelText('Credit line 2'), '30000');
    await user.type(screen.getByLabelText('Narration'), 'May rent');

    expect(screen.getByText('Difference ₹5,000.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post voucher' })).toBeDisabled();

    await user.clear(screen.getByLabelText('Credit line 2'));
    await user.type(screen.getByLabelText('Credit line 2'), '35000');
    expect(screen.getByText('Balanced')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Post voucher' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(apiClient.post.mock.calls[0][1].lines).toEqual([
      { accountId: 'rent', debitPaise: 3500000, creditPaise: 0 },
      { accountId: 'hdfc', debitPaise: 0, creditPaise: 3500000 },
    ]);
  });

  it('clears the other side of a line when one side is typed', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VoucherFormDialog open onOpenChange={() => {}} voucherType="JOURNAL" />);
    await waitForAccounts();
    await user.type(screen.getByLabelText('Debit line 1'), '100');
    await user.type(screen.getByLabelText('Credit line 1'), '50');
    expect(screen.getByLabelText('Debit line 1')).toHaveValue(null);
    expect(screen.getByLabelText('Credit line 1')).toHaveValue(50);
  });

  it('shows the server refusal instead of closing', async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValueOnce({ response: { data: { message: 'Insufficient cash at this factory' } } });
    renderWithQuery(<VoucherFormDialog open onOpenChange={() => {}} voucherType="CONTRA" />);
    await waitForAccounts();
    await waitFor(() => expect(screen.getByLabelText('Factory')).toHaveValue('f1'));
    await user.selectOptions(screen.getByLabelText('From'), 'cash');
    await user.selectOptions(screen.getByLabelText('To'), 'hdfc');
    await user.type(screen.getByLabelText('Amount (₹)'), '999999');
    await user.type(screen.getByLabelText('Narration'), 'Deposit');
    await user.click(screen.getByRole('button', { name: 'Post voucher' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient cash at this factory');
  });
});

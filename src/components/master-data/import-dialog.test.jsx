import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { MasterImportDialog } from './import-dialog';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { toast } = await import('sonner');

/**
 * The whole point of this dialog is the pause between "I uploaded a file" and
 * "the file is in the database". These tests are about that pause: that the
 * user is told what will happen, that a file with a bad row cannot be
 * committed by accident, and that the commit names the checked run rather than
 * resending rows nobody re-checked.
 */

const CLEAN = {
  importId: 'run-1',
  module: 'products',
  fileName: 'products.xlsx',
  status: 'VALIDATED',
  columns: ['ID', 'Product Code', 'Product Name', 'Product Type', 'Unit Code'],
  totalRows: 3, validRows: 3, newRows: 2, updateRows: 1, unchangedRows: 0, skippedRows: 0, errorRows: 0,
  warnings: [],
  truncated: false,
  rows: [
    { rowNumber: 2, status: 'NEW', errors: [], changes: null, values: { 'Product Code': 'FG-PIPE-600', 'Product Name': 'RCC Pipe 600mm' } },
    { rowNumber: 3, status: 'NEW', errors: [], changes: null, values: { 'Product Code': 'FG-PIPE-900', 'Product Name': 'RCC Pipe 900mm' } },
    {
      rowNumber: 4, status: 'UPDATE', errors: [],
      changes: { 'Selling Price (Rs)': { from: 450000, to: 480000 } },
      values: { 'Product Code': 'FG-KERB', 'Product Name': 'Kerb Stone' },
    },
  ],
};

const BROKEN = {
  ...CLEAN,
  importId: 'run-2',
  status: 'FAILED',
  totalRows: 2, validRows: 1, newRows: 1, updateRows: 0, errorRows: 1,
  rows: [
    { rowNumber: 2, status: 'NEW', errors: [], changes: null, values: { 'Product Code': 'FG-OK' } },
    {
      rowNumber: 3, status: 'ERROR',
      errors: [{ column: 'Product Name', message: 'Product Name is required' }],
      values: { 'Product Code': 'FG-BAD' },
    },
  ],
};

const file = () => new File(['xlsx bytes'], 'products.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.get.mockResolvedValue({ data: new Blob(['xlsx']), headers: {} });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:generated'), revokeObjectURL: vi.fn() });
});

afterEach(() => vi.unstubAllGlobals());

const open = (props = {}) =>
  renderWithQuery(
    <MasterImportDialog open onOpenChange={() => {}} module="products" label="Products" {...props} />
  );

const uploadAndCheck = async (u, preview) => {
  apiClient.post.mockResolvedValueOnce({ data: { data: preview } });
  await u.upload(screen.getByLabelText('Excel file (.xlsx)'), file());
  await u.click(screen.getByRole('button', { name: /Check this file/ }));
  await screen.findByText('3. What this will do');
};

describe('Importing a master data file', () => {
  it('will not let anything be imported before a file has been checked', async () => {
    open();
    expect(screen.getByRole('button', { name: /^Import$/ })).toBeDisabled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('checks the file without writing anything, and says what it would do', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, CLEAN);

    const [url, , config] = apiClient.post.mock.calls[0];
    expect(url).toBe('/master-data/products/import/validate');
    expect(config.params).toMatchObject({ importMode: 'UPSERT' });

    const tallies = screen.getByRole('group', { name: 'What this file will do' });
    expect(within(tallies).getByText('New').nextSibling).toHaveTextContent('2');
    expect(within(tallies).getByText('Changed').nextSibling).toHaveTextContent('1');
    expect(within(tallies).getByText('Errors').nextSibling).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /Import 3 record/ })).toBeEnabled();
  });

  it('shows what changes about a row that already exists', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, CLEAN);
    expect(screen.getByText(/Selling Price \(Rs\): 450000/)).toBeInTheDocument();
    expect(screen.getByText('480000')).toBeInTheDocument();
  });

  it('commits by naming the checked run, not by resending the rows', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, CLEAN);

    apiClient.post.mockResolvedValueOnce({ data: { data: { ...CLEAN, status: 'COMMITTED', createdCount: 2, updatedCount: 1 } } });
    await u.click(screen.getByRole('button', { name: /Import 3 record/ }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
    expect(apiClient.post.mock.calls[1][0]).toBe('/master-data/imports/run-1/commit');
    // No body: the server already holds what it checked.
    expect(apiClient.post.mock.calls[1][1]).toBeUndefined();
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/2 created, 1 updated/));
  });

  it('blocks the import outright when any row has a problem, and offers the failed rows back', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, BROKEN);

    expect(screen.getByRole('button', { name: /^Import$/ })).toBeDisabled();
    expect(screen.getByText('Product Name is required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download the 1 failed row/ })).toBeInTheDocument();
  });

  it('opens on the errors when there are any, so they are not buried', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, BROKEN);
    // The Errors filter is the selected one, so the clean row is out of view.
    expect(screen.queryByText('FG-OK')).not.toBeInTheDocument();
    expect(screen.getByText('FG-BAD')).toBeInTheDocument();
  });

  it('says how long a slow import will take before it is started', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, { ...CLEAN, estimatedCommitSeconds: 125, databaseRoundTripMs: 29 });
    // A two-minute wait nobody was warned about reads as a hang.
    expect(screen.getByText(/This will take about/)).toHaveTextContent('2 minutes');
    expect(screen.getByText(/29 ms away/)).toBeInTheDocument();
  });

  it('stays quiet about timing when the import is quick', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, { ...CLEAN, estimatedCommitSeconds: 3, databaseRoundTripMs: 1 });
    expect(screen.queryByText(/This will take about/)).not.toBeInTheDocument();
  });

  it('repeats the warning about rate columns a role may not set', async () => {
    const u = userEvent.setup();
    open();
    await uploadAndCheck(u, { ...CLEAN, warnings: ['Rate columns (Selling Price (Rs)) are ignored — your role does not permit viewing or setting rates.'] });
    expect(screen.getByText(/Rate columns .* are ignored/)).toBeInTheDocument();
  });

  it('sends the chosen mode, so a file can be made create-only', async () => {
    const u = userEvent.setup();
    open();
    await u.selectOptions(screen.getByLabelText('What this file should do'), 'CREATE');
    apiClient.post.mockResolvedValueOnce({ data: { data: CLEAN } });
    await u.upload(screen.getByLabelText('Excel file (.xlsx)'), file());
    await u.click(screen.getByRole('button', { name: /Check this file/ }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(apiClient.post.mock.calls[0][2].params.importMode).toBe('CREATE');
  });

  it('offers only "update existing" to a role that may not create records', async () => {
    open({ canCreate: false });
    const select = screen.getByLabelText('What this file should do');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Update existing only']);
    // And it opens on that one, rather than on a value it does not offer.
    expect(select).toHaveValue('UPDATE');
  });

  it('shows the server refusal rather than a blank dialog when a file is rejected', async () => {
    const u = userEvent.setup();
    open();
    apiClient.post.mockRejectedValueOnce({ response: { data: { message: 'Missing column: Product Name' } } });
    await u.upload(screen.getByLabelText('Excel file (.xlsx)'), file());
    await u.click(screen.getByRole('button', { name: /Check this file/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Missing column: Product Name');
  });
});

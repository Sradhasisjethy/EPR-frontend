import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import BundlesPage from './BundlesPage';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const { apiClient } = await import('@/lib/api-client');

/**
 * The lifecycle is the point of this screen, and one of these tests exists
 * because the first version had a dead end: archiving a bundle stranded its
 * code, because `create` refuses to reuse one and "New version" was only
 * offered on ACTIVE rules.
 */

const rule = (over = {}) => ({
  id: 'r1', code: 'BND-RCC-600', name: 'RCC Pipe Jointing Kit',
  version: 1, status: 'ACTIVE', effectiveFrom: '2026-09-04', effectiveTo: null,
  parentProduct: { id: 'p1', name: 'RCC Pipe 600mm' },
  components: [{ componentProductId: 'a1' }],
  ...over,
});

const respondWith = (rules, reasons = [{ code: 'ALREADY_HAS', label: 'Customer already has one', requiresNote: false }]) =>
  apiClient.get.mockImplementation((url = '') =>
    Promise.resolve({
      data: { data: String(url).includes('reason-codes') ? reasons : { rows: rules, count: rules.length } },
    })
  );

beforeEach(() => {
  for (const m of [apiClient.get, apiClient.post, apiClient.put, apiClient.delete]) m.mockReset();
  apiClient.post.mockResolvedValue({ data: { data: {} } });
  apiClient.delete.mockResolvedValue({ data: { data: {} } });
});

describe('BundlesPage', () => {
  it('lists a bundle with its version and state', async () => {
    respondWith([rule()]);
    renderWithQuery(<BundlesPage />);

    expect(await screen.findByText('RCC Pipe Jointing Kit')).toBeInTheDocument();
    expect(screen.getByText('BND-RCC-600')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('offers edit and publish only on a draft', async () => {
    respondWith([rule({ status: 'DRAFT' })]);
    renderWithQuery(<BundlesPage />);

    expect(await screen.findByTitle('Edit this draft')).toBeInTheDocument();
    expect(screen.getByTitle(/Publish/)).toBeInTheDocument();
  });

  it('will not let a published bundle be edited in place', async () => {
    respondWith([rule({ status: 'ACTIVE' })]);
    renderWithQuery(<BundlesPage />);

    await screen.findByText('RCC Pipe Jointing Kit');
    // Orders were quoted from it; the route is a new version.
    expect(screen.queryByTitle('Edit this draft')).not.toBeInTheDocument();
    expect(screen.getByTitle('Start a new version')).toBeInTheDocument();
  });

  it('offers a way back from an archived bundle', async () => {
    const user = userEvent.setup();
    respondWith([rule({ status: 'ARCHIVED', effectiveTo: '2026-09-05' })]);
    renderWithQuery(<BundlesPage />);

    // The dead end this fixes: `create` refuses to reuse the code, so without
    // this button an archived bundle could never be brought back.
    const button = await screen.findByTitle('Bring this bundle back as a new version');
    await user.click(button);

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/bundles/rules/r1/new-version', {}));
  });

  it('publishes a draft', async () => {
    const user = userEvent.setup();
    respondWith([rule({ status: 'DRAFT' })]);
    renderWithQuery(<BundlesPage />);

    await user.click(await screen.findByTitle(/Publish/));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/bundles/rules/r1/publish', { effectiveFrom: undefined }));
  });

  it('explains itself when there are no bundles yet', async () => {
    respondWith([]);
    renderWithQuery(<BundlesPage />);

    expect(await screen.findByText('No bundles yet')).toBeInTheDocument();
  });

  it('lists the removal reasons and says which one needs a note', async () => {
    respondWith([rule()], [
      { code: 'ALREADY_HAS', label: 'Customer already has one', requiresNote: false },
      { code: 'OTHER', label: 'Other', requiresNote: true },
    ]);
    renderWithQuery(<BundlesPage />);

    expect(await screen.findByText('Customer already has one')).toBeInTheDocument();
    expect(screen.getByText('needs a note')).toBeInTheDocument();
  });

  it('points at the seeding command when no reasons exist', async () => {
    respondWith([rule()], []);
    renderWithQuery(<BundlesPage />);

    // Without a reason code the remove button on an order cannot work at all.
    expect(await screen.findByText(/bundles:ensure-reasons/)).toBeInTheDocument();
  });

  it('adds a reason code', async () => {
    const user = userEvent.setup();
    respondWith([rule()]);
    renderWithQuery(<BundlesPage />);

    await user.type(await screen.findByPlaceholderText('SITE_HAS_STOCK'), 'DAMAGED');
    await user.type(screen.getByPlaceholderText('Site already has stock'), 'Arrived damaged');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/bundles/reason-codes', { code: 'DAMAGED', label: 'Arrived damaged' })
    );
  });

  it('deactivates a reason rather than deleting it', async () => {
    const user = userEvent.setup();
    respondWith([rule()]);
    renderWithQuery(<BundlesPage />);

    await user.click(await screen.findByTitle(/Deactivate/));
    // Past orders keep pointing at their reason, so history stays readable.
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/bundles/reason-codes/ALREADY_HAS'));
  });
});

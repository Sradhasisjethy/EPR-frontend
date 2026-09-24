import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { MasterImportExportActions } from './import-export-actions';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/**
 * Buttons appear only where the permission is held.
 *
 * The API enforces the same rule on its own — hiding a button is a courtesy,
 * not a control — but a user staring at an Import button that always answers
 * 403 is its own kind of broken.
 */

const user = (permissions) => ({ id: 'u1', role: 'EMPLOYEE', permissions });

const mockUser = (permissions) => {
  apiClient.get.mockImplementation((url) => {
    if (String(url).includes('/auth/me')) return Promise.resolve({ data: { data: user(permissions) } });
    return Promise.resolve({ data: new Blob(['xlsx']), headers: { 'content-disposition': 'attachment; filename="Products_2026-09-24.xlsx"' } });
  });
};

beforeEach(() => {
  apiClient.get.mockReset();
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:generated'), revokeObjectURL: vi.fn() });
});

afterEach(() => vi.unstubAllGlobals());

const render = () =>
  renderWithQuery(<MasterImportExportActions module="products" label="Products" resource="PRODUCT" filters={{ status: 'active' }} />);

describe('The import/export buttons', () => {
  it('offers all three to someone who may do all three', async () => {
    mockUser(['PRODUCT_READ', 'PRODUCT_IMPORT', 'PRODUCT_EXPORT']);
    render();
    expect(await screen.findByRole('button', { name: /Import Excel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Excel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sample Excel/ })).toBeInTheDocument();
  });

  it('hides Import from someone who may only export', async () => {
    mockUser(['PRODUCT_READ', 'PRODUCT_EXPORT']);
    render();
    expect(await screen.findByRole('button', { name: /Export Excel/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import Excel/ })).not.toBeInTheDocument();
  });

  it('hides Export from someone who may only import', async () => {
    mockUser(['PRODUCT_READ', 'PRODUCT_IMPORT']);
    render();
    expect(await screen.findByRole('button', { name: /Import Excel/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export Excel/ })).not.toBeInTheDocument();
  });

  it('still offers the sample to a plain reader — a blank template leaks nothing', async () => {
    mockUser(['PRODUCT_READ']);
    render();
    expect(await screen.findByRole('button', { name: /Sample Excel/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import Excel/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export Excel/ })).not.toBeInTheDocument();
  });

  it('sends the filters the screen is showing, so the file is what the user is looking at', async () => {
    mockUser(['PRODUCT_READ', 'PRODUCT_EXPORT']);
    const u = userEvent.setup();
    render();
    await u.click(await screen.findByRole('button', { name: /Export Excel/ }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/master-data/products/export',
        expect.objectContaining({ params: { status: 'active' }, responseType: 'blob' })
      )
    );
  });

  it('downloads the sample under the name the server chose', async () => {
    mockUser(['PRODUCT_READ']);
    const u = userEvent.setup();
    render();
    await screen.findByRole('button', { name: /Sample Excel/ });

    // Only the anchor is faked, and only once the component has rendered:
    // React needs the real createElement for everything else.
    const realCreate = document.createElement.bind(document);
    // A real anchor, because the download really appends it to the body — a
    // plain object would throw there and the click would never happen.
    const link = realCreate('a');
    const click = vi.spyOn(link, 'click').mockImplementation(() => {});
    const spy = vi.spyOn(document, 'createElement').mockImplementation((tag) => (tag === 'a' ? link : realCreate(tag)));

    await u.click(screen.getByRole('button', { name: /Sample Excel/ }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(link.download).toBe('Products_2026-09-24.xlsx');
    spy.mockRestore();
  });
});

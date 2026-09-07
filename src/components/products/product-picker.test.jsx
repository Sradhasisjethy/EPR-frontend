import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { ProductPicker } from './product-picker';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

const { apiClient } = await import('@/lib/api-client');

/**
 * These cover the bug this component was built to remove: the list endpoint
 * caps `limit` at 100, so a plain <select> silently showed only the first
 * hundred products alphabetically and anything later became unselectable, with
 * nothing on screen to say so.
 */

const product = (id, name, code) => ({ id, name, code, uomId: `uom-${id}`, uom: { code: 'NOS' } });

const respondWith = (rows, count = rows.length) =>
  apiClient.get.mockImplementation((url) => {
    if (url === '/products') return Promise.resolve({ data: { data: { rows, count } } });
    // useProduct(id) resolves the chosen item's label by id.
    const id = url.split('/').pop();
    return Promise.resolve({ data: { data: rows.find((r) => r.id === id) || null } });
  });

beforeEach(() => {
  apiClient.get.mockReset();
});

describe('ProductPicker', () => {
  it('searches the server rather than filtering a preloaded list', async () => {
    const user = userEvent.setup();
    respondWith([product('1', 'Reinforced Concrete Pipe 600mm', 'RCC-600')]);

    renderWithQuery(<ProductPicker value="" onChange={vi.fn()} />);
    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search products…'), 'pipe');

    await waitFor(() => {
      const calls = apiClient.get.mock.calls.filter(([url]) => url === '/products');
      expect(calls.at(-1)[1].params).toMatchObject({ search: 'pipe' });
    });
  });

  it('says when there are more results than it is showing', async () => {
    const user = userEvent.setup();
    respondWith([product('1', 'Item One', 'A1'), product('2', 'Item Two', 'A2')], 340);

    renderWithQuery(<ProductPicker value="" onChange={vi.fn()} />);
    await user.click(screen.getByRole('button'));

    // The whole point: truncation is stated, not silent.
    expect(await screen.findByText(/Showing 2 of 340/)).toBeInTheDocument();
  });

  it('does not claim there is more when the list is complete', async () => {
    const user = userEvent.setup();
    respondWith([product('1', 'Only Item', 'A1')]);

    renderWithQuery(<ProductPicker value="" onChange={vi.fn()} />);
    await user.click(screen.getByRole('button'));

    await screen.findByText('Only Item');
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('hands back the whole product, not just its id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    respondWith([product('p1', 'T-Hooks', 'ACC-HOOK')]);

    renderWithQuery(<ProductPicker value="" onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(await screen.findByText('T-Hooks'));

    // The bundle form needs `uomId` off the object to fill in the unit.
    expect(onChange).toHaveBeenCalledWith('p1', expect.objectContaining({ id: 'p1', uomId: 'uom-p1' }));
  });

  it('shows the selected item even when it is not in the current results', async () => {
    // Editing an old record: the chosen product is on page 7 of the catalogue,
    // so it is fetched by id rather than looked up in the visible page.
    const chosen = product('old-1', 'Archived Kerb Stone', 'KERB-1');
    apiClient.get.mockImplementation((url) =>
      url === '/products'
        ? Promise.resolve({ data: { data: { rows: [product('x', 'Something Else', 'SE')], count: 400 } } })
        : Promise.resolve({ data: { data: chosen } })
    );

    renderWithQuery(<ProductPicker value="old-1" onChange={vi.fn()} />);
    expect(await screen.findByText('Archived Kerb Stone')).toBeInTheDocument();
  });

  it('passes filters through to the query', async () => {
    const user = userEvent.setup();
    respondWith([product('1', 'EPDM Rubber Gasket 600mm', 'ACC-GASKET')]);

    renderWithQuery(
      <ProductPicker value="" onChange={vi.fn()} filters={{ isAccessory: 'true', status: 'active' }} />
    );
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      const call = apiClient.get.mock.calls.find(([url]) => url === '/products');
      expect(call[1].params).toMatchObject({ isAccessory: 'true', status: 'active' });
    });
  });

  it('says so when nothing matches instead of looking empty', async () => {
    const user = userEvent.setup();
    respondWith([]);

    renderWithQuery(<ProductPicker value="" onChange={vi.fn()} />);
    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search products…'), 'zzz');

    expect(await screen.findByText(/Nothing matches "zzz"/)).toBeInTheDocument();
  });
});

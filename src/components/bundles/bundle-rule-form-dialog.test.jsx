import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { BundleRuleFormDialog } from './bundle-rule-form-dialog';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const { apiClient } = await import('@/lib/api-client');

/**
 * The form that defines what a product brings with it. Two rules matter more
 * than the rest, and both were live defects before they were enforced:
 *
 *   - the unit is the product's own, because expansion converts nothing and a
 *     mismatched unit puts the wrong quantity on the order silently;
 *   - a published rule cannot be edited, because open orders were quoted from it.
 */

const gasket = { id: 'acc-1', name: 'EPDM Rubber Gasket 600mm', code: 'ACC-GASKET', uomId: 'uom-nos', uom: { code: 'NOS' } };
const pipe = { id: 'p-1', name: 'RCC Pipe 600mm', code: 'RCC-600', uomId: 'uom-nos', uom: { code: 'NOS' } };

const respondWith = ({ accessories = [gasket], products = [pipe, gasket] } = {}) =>
  apiClient.get.mockImplementation((url = '', config = {}) => {
    if (String(url).includes('/products/')) {
      const id = String(url).split('/').pop();
      return Promise.resolve({ data: { data: products.find((p) => p.id === id) || null } });
    }
    const isAccessoryQuery = config?.params?.isAccessory === 'true';
    const rows = isAccessoryQuery ? accessories : products;
    return Promise.resolve({ data: { data: { rows, count: rows.length } } });
  });

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.put.mockReset();
  apiClient.post.mockResolvedValue({ data: { data: { id: 'new-1' } } });
  apiClient.put.mockResolvedValue({ data: { data: { id: 'new-1' } } });
});

describe('BundleRuleFormDialog', () => {
  it('takes the unit from the chosen accessory rather than asking', async () => {
    const user = userEvent.setup();
    respondWith();
    renderWithQuery(<BundleRuleFormDialog open onOpenChange={vi.fn()} rule={null} />);

    expect(await screen.findByText('Pick an item first')).toBeInTheDocument();

    // The accessory picker is the second one; the first chooses the parent.
    const pickers = screen.getAllByRole('button', { name: /Search/ });
    await user.click(pickers[pickers.length - 1]);
    await user.click(await screen.findByText('EPDM Rubber Gasket 600mm'));

    // Expansion does no unit conversion, so the unit must be the product's own.
    expect(await screen.findByText('NOS')).toBeInTheDocument();
    expect(screen.queryByText('Pick an item first')).not.toBeInTheDocument();
  });

  it('refuses to save without the things a bundle cannot work without', async () => {
    const user = userEvent.setup();
    respondWith();
    renderWithQuery(<BundleRuleFormDialog open onOpenChange={vi.fn()} rule={null} />);

    await user.click(await screen.findByRole('button', { name: 'Create draft' }));

    expect(await screen.findByText(/needs a code, a name, the product it belongs to/)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('locks the code when editing, because it identifies the bundle across versions', async () => {
    respondWith();
    renderWithQuery(
      <BundleRuleFormDialog
        open onOpenChange={vi.fn()}
        rule={{
          id: 'r1', code: 'BND-RCC-600', name: 'RCC Pipe Jointing Kit', status: 'DRAFT',
          parentProductId: 'p-1', effectiveFrom: '2026-09-04', priority: 100,
          components: [{ componentProductId: 'acc-1', quantity: '2.0000', scalingMode: 'PROPORTIONAL', uomId: 'uom-nos', uom: { code: 'NOS' }, isMandatory: false, defaultSelected: true }],
        }}
      />
    );

    expect(await screen.findByDisplayValue('BND-RCC-600')).toBeDisabled();
    expect(screen.getByText(/cannot change/)).toBeInTheDocument();
  });

  it('shows a saved quantity without its database scale', async () => {
    respondWith();
    renderWithQuery(
      <BundleRuleFormDialog
        open onOpenChange={vi.fn()}
        rule={{
          id: 'r1', code: 'BND-RCC-600', name: 'Kit', status: 'DRAFT',
          parentProductId: 'p-1', effectiveFrom: '2026-09-04', priority: 100,
          components: [{ componentProductId: 'acc-1', quantity: '2.0000', scalingMode: 'PROPORTIONAL', uomId: 'uom-nos', uom: { code: 'NOS' }, isMandatory: false, defaultSelected: true }],
        }}
      />
    );

    // "2.0000" is scale, not information.
    expect(await screen.findByDisplayValue('2')).toBeInTheDocument();
  });

  it('offers only accessories, with a way out when something is not marked yet', async () => {
    const user = userEvent.setup();
    respondWith({ accessories: [] });
    renderWithQuery(<BundleRuleFormDialog open onOpenChange={vi.fn()} rule={null} />);

    expect(await screen.findByText(/Nothing is marked as an accessory yet/)).toBeInTheDocument();

    await user.click(screen.getByText('Show all products'));
    expect(screen.getByText(/Showing every product/)).toBeInTheDocument();
  });

  it('sends the whole bundle in one call, sequenced', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    respondWith();
    renderWithQuery(<BundleRuleFormDialog open onOpenChange={onOpenChange} rule={null} />);

    await user.type(await screen.findByPlaceholderText('RCC-PIPE-KIT'), 'BND-TEST');
    await user.type(screen.getByPlaceholderText('RCC pipe jointing kit'), 'Test Kit');

    const pickers = screen.getAllByRole('button', { name: /Search/ });
    await user.click(pickers[0]);
    await user.click(await screen.findByText('RCC Pipe 600mm'));

    const accessoryPickers = screen.getAllByRole('button', { name: /Search accessories/ });
    await user.click(accessoryPickers[0]);
    await user.click(await screen.findByText('EPDM Rubber Gasket 600mm'));

    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/bundles/rules');
    expect(body).toMatchObject({ code: 'BND-TEST', name: 'Test Kit', parentProductId: 'p-1' });
    expect(body.components[0]).toMatchObject({ componentProductId: 'acc-1', sequence: 1 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('surfaces a refusal from the server instead of closing silently', async () => {
    const user = userEvent.setup();
    respondWith();
    apiClient.post.mockRejectedValue({ response: { data: { message: 'Bundle code "X" already belongs to something else.' } } });

    const onOpenChange = vi.fn();
    renderWithQuery(<BundleRuleFormDialog open onOpenChange={onOpenChange} rule={null} />);

    await user.type(await screen.findByPlaceholderText('RCC-PIPE-KIT'), 'X');
    await user.type(screen.getByPlaceholderText('RCC pipe jointing kit'), 'Test Kit');

    const pickers = screen.getAllByRole('button', { name: /Search/ });
    await user.click(pickers[0]);
    await user.click(await screen.findByText('RCC Pipe 600mm'));
    const accessoryPickers = screen.getAllByRole('button', { name: /Search accessories/ });
    await user.click(accessoryPickers[0]);
    await user.click(await screen.findByText('EPDM Rubber Gasket 600mm'));

    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(await screen.findByText(/already belongs to something else/)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

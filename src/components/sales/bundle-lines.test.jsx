import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithQuery } from '@/test/render';
import { BundleLines } from './bundle-lines';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const { apiClient } = await import('@/lib/api-client');

/**
 * The grouping is the argument for the whole feature: a salesperson has to see
 * at a glance that the pipe brought two gaskets and that one was taken off. A
 * flat list makes a bundle indistinguishable from unrelated lines.
 */

const line = (over = {}) => ({
  id: 'l1', productId: 'p1', product: { name: 'Product' },
  orderedQty: '1', dispatchedQty: '0', productionRequired: '0', ratePaise: '10000',
  lineRole: 'STANDALONE', parentLineId: null, syncState: 'SYNCED', origin: 'MANUAL',
  systemQty: null, bundleSnapshot: null,
  ...over,
});

const order = (lines) => ({ id: 'o1', status: 'DRAFT', lines });

const parentWithTwoAccessories = () =>
  order([
    line({
      id: 'parent', productId: 'pipe', product: { name: 'RCC Pipe 600mm' }, lineRole: 'PARENT',
      orderedQty: '2', bundleSnapshot: { components: [{}, {}, {}] },
    }),
    line({ id: 'c1', productId: 'gasket', product: { name: 'EPDM Gasket' }, lineRole: 'COMPONENT', parentLineId: 'parent', orderedQty: '4', origin: 'RULE_AUTO' }),
    line({ id: 'c2', productId: 'hook', product: { name: 'T-Hooks' }, lineRole: 'COMPONENT', parentLineId: 'parent', orderedQty: '2', origin: 'RULE_AUTO' }),
  ]);

beforeEach(() => {
  apiClient.get.mockReset();
  // available-accessories and reason-codes are both fetched by the group.
  apiClient.get.mockResolvedValue({ data: { data: [] } });
});

describe('BundleLines', () => {
  it('groups components under the product that brought them', async () => {
    renderWithQuery(<BundleLines order={parentWithTwoAccessories()} editable showRates />);

    const rows = screen.getAllByRole('row');
    const text = rows.map((r) => r.textContent);
    const parentRow = text.findIndex((t) => t.includes('RCC Pipe 600mm'));
    const gasketRow = text.findIndex((t) => t.includes('EPDM Gasket'));

    // Components follow their parent rather than sorting in among everything.
    expect(parentRow).toBeGreaterThan(-1);
    expect(gasketRow).toBeGreaterThan(parentRow);
  });

  it('summarises the group on the parent', async () => {
    renderWithQuery(<BundleLines order={parentWithTwoAccessories()} editable showRates />);

    // Two present of three offered by the rule.
    expect(await screen.findByText(/2 of 3 accessories/)).toBeInTheDocument();
  });

  it('flags a quantity the user overrode, and offers to reset it', async () => {
    const o = order([
      line({ id: 'parent', product: { name: 'RCC Pipe' }, lineRole: 'PARENT', bundleSnapshot: { components: [{}] } }),
      line({
        id: 'c1', productId: 'gasket', product: { name: 'EPDM Gasket' }, lineRole: 'COMPONENT',
        parentLineId: 'parent', orderedQty: '5', systemQty: '2', syncState: 'QTY_OVERRIDDEN',
      }),
    ]);
    renderWithQuery(<BundleLines order={o} editable showRates />);

    expect(await screen.findByText(/changed from 2/)).toBeInTheDocument();
    expect(screen.getByTitle('Reset to suggested (2)')).toBeInTheDocument();
  });

  it('marks a component the rule no longer manages instead of hiding it', async () => {
    const o = order([
      line({ id: 'parent', product: { name: 'RCC Pipe' }, lineRole: 'PARENT', bundleSnapshot: { components: [] } }),
      line({
        id: 'c1', productId: 'old', product: { name: 'Withdrawn Item' }, lineRole: 'COMPONENT',
        parentLineId: 'parent', syncState: 'DETACHED',
      }),
    ]);
    renderWithQuery(<BundleLines order={o} editable showRates />);

    // Deleting it would drop something the customer was quoted.
    expect(await screen.findByText('Withdrawn Item')).toBeInTheDocument();
    expect(screen.getByText(/no longer in the bundle/)).toBeInTheDocument();
  });

  it('offers no edit controls on an order that is past DRAFT', async () => {
    renderWithQuery(<BundleLines order={parentWithTwoAccessories()} editable={false} showRates />);

    // A confirmed order holds stock reservations; its lines must not be edited.
    expect(screen.queryByTitle('Remove this accessory')).not.toBeInTheDocument();
  });

  it('hides money from a user without VIEW_RATES', async () => {
    renderWithQuery(<BundleLines order={parentWithTwoAccessories()} editable showRates={false} />);

    const header = screen.getAllByRole('row')[0];
    expect(within(header).queryByText('Rate')).not.toBeInTheDocument();
    expect(within(header).queryByText('Amount')).not.toBeInTheDocument();
  });

  it('says so plainly when an order has no lines', async () => {
    renderWithQuery(<BundleLines order={order([])} editable showRates />);
    expect(screen.getByText(/No lines on this order yet/)).toBeInTheDocument();
  });
});

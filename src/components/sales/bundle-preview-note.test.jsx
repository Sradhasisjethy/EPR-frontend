import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '@/test/render';
import { BundlePreviewNote } from './bundle-preview-note';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

const { apiClient } = await import('@/lib/api-client');

/**
 * This note is the only warning a salesperson gets before saving. Two of the
 * things it reports were live defects on real data: an accessory with no price
 * list entry went onto orders free, and one with no HSN was invoiced at 0% GST
 * — both silently, all the way to the GST return.
 */

const preview = (overrides = {}) => ({
  bundleRuleId: 'rule-1',
  components: [
    {
      componentProductId: 'c1',
      productName: 'EPDM Rubber Gasket 600mm',
      qty: 2,
      action: 'CREATE',
      unitPricePaise: 45000,
      gstRatePercent: 18,
    },
  ],
  optional: [],
  ...overrides,
});

/** Per-URL, because the component also looks up the removal reason codes. */
const respondWith = (data, reasons = [{ code: 'ALREADY_HAS', label: 'Customer already has one', requiresNote: false }]) =>
  apiClient.get.mockImplementation((url = '') =>
    Promise.resolve({ data: { data: String(url).includes('reason-codes') ? reasons : data } })
  );

beforeEach(() => apiClient.get.mockReset());

describe('BundlePreviewNote', () => {
  it('says what the product brings with it', async () => {
    respondWith(preview());
    renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    expect(await screen.findByText(/EPDM Rubber Gasket 600mm × 2/)).toBeInTheDocument();
  });

  it('stays silent for a product with no bundle', async () => {
    respondWith({ bundleRuleId: null, components: [], optional: [] });
    const { container } = renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    // An ordinary order must look exactly as it did before bundles existed.
    expect(container).toBeEmptyDOMElement();
  });

  it('warns when an accessory has no price', async () => {
    respondWith(preview({
      components: [{ productName: 'T-Hooks', qty: 2, action: 'CREATE', unitPricePaise: 0, gstRatePercent: 18 }],
    }));
    renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    expect(await screen.findByText(/will be added free/)).toBeInTheDocument();
    expect(screen.queryByText(/taxed at 0%/)).not.toBeInTheDocument();
  });

  it('warns when an accessory has no HSN', async () => {
    respondWith(preview({
      components: [{ productName: 'T-Hooks', qty: 2, action: 'CREATE', unitPricePaise: 30000, gstRatePercent: 0 }],
    }));
    renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    expect(await screen.findByText(/taxed at 0%/)).toBeInTheDocument();
    expect(screen.queryByText(/added free/)).not.toBeInTheDocument();
  });

  it('says nothing alarming when the accessory is priced and taxed', async () => {
    respondWith(preview());
    renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    await screen.findByText(/EPDM Rubber Gasket 600mm/);
    expect(screen.queryByText(/added free/)).not.toBeInTheDocument();
    expect(screen.queryByText(/taxed at 0%/)).not.toBeInTheDocument();
  });

  it('mentions optional extras separately from what is added automatically', async () => {
    respondWith(preview({ optional: [{ componentProductId: 'o1', productName: 'Lifting Hook' }] }));
    renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    expect(await screen.findByText(/1 optional extra available after saving/)).toBeInTheDocument();
  });

  it('asks for the quantity the user typed, so the preview scales', async () => {
    respondWith(preview());
    renderWithQuery(<BundlePreviewNote productId="p1" qty="3" partyId="party-1" />);

    await screen.findByText(/EPDM Rubber Gasket 600mm/);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/products/p1/bundle-preview',
      expect.objectContaining({ params: expect.objectContaining({ qty: 3, partyId: 'party-1' }) })
    );
  });

  it('lets an accessory be declined before the order is saved', async () => {
    const user = userEvent.setup();
    const onExclude = vi.fn();
    respondWith(preview());

    renderWithQuery(
      <BundlePreviewNote productId="p1" qty={1} overrides={[]} onExclude={onExclude} onRestore={vi.fn()} />
    );

    await user.click(await screen.findByTitle(/Leave EPDM Rubber Gasket 600mm off this order/));

    // Declined with a reason, exactly as the order screen demands afterwards —
    // the attach-rate report must see both routes the same way.
    expect(onExclude).toHaveBeenCalledWith({ componentProductId: 'c1', exclude: true, reasonCode: 'ALREADY_HAS' });
  });

  it('shows a declined accessory as put aside, with a way back', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    respondWith(preview());

    renderWithQuery(
      <BundlePreviewNote
        productId="p1" qty={1}
        overrides={[{ componentProductId: 'c1', exclude: true, reasonCode: 'ALREADY_HAS' }]}
        onExclude={vi.fn()} onRestore={onRestore}
      />
    );

    expect(await screen.findByText('Left off:')).toBeInTheDocument();
    await user.click(screen.getByText('EPDM Rubber Gasket 600mm'));
    expect(onRestore).toHaveBeenCalledWith('c1');
  });

  it('does not warn about the price of something being left off', async () => {
    respondWith(preview({
      components: [{ componentProductId: 'c1', productName: 'T-Hooks', qty: 2, action: 'CREATE', unitPricePaise: 0, gstRatePercent: 18 }],
    }));

    renderWithQuery(
      <BundlePreviewNote
        productId="p1" qty={1}
        overrides={[{ componentProductId: 'c1', exclude: true, reasonCode: 'ALREADY_HAS' }]}
        onExclude={vi.fn()} onRestore={vi.fn()}
      />
    );

    await screen.findByText('Left off:');
    // Only what is actually going on the order can be mispriced.
    expect(screen.queryByText(/added free/)).not.toBeInTheDocument();
  });

  it('offers no remove control when the form is read-only', async () => {
    respondWith(preview());
    renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    await screen.findByText(/EPDM Rubber Gasket 600mm/);
    expect(screen.queryByTitle(/off this order/)).not.toBeInTheDocument();
  });

  it('lets an accessory quantity be set before the order is saved', async () => {
    const user = userEvent.setup();
    const onQuantity = vi.fn();
    respondWith(preview());

    renderWithQuery(
      <BundlePreviewNote
        productId="p1" qty={1} overrides={[]}
        onExclude={vi.fn()} onRestore={vi.fn()} onQuantity={onQuantity}
      />
    );

    await user.click(await screen.findByLabelText(/Increase EPDM Rubber Gasket 600mm quantity/));
    expect(onQuantity).toHaveBeenCalledWith('c1', 3);   // rule says 2
  });

  it('shows the typed quantity and offers the bundle default back', async () => {
    const user = userEvent.setup();
    const onQuantity = vi.fn();
    respondWith(preview());

    renderWithQuery(
      <BundlePreviewNote
        productId="p1" qty={1}
        overrides={[{ componentProductId: 'c1', qty: 7 }]}
        onExclude={vi.fn()} onRestore={vi.fn()} onQuantity={onQuantity}
      />
    );

    expect(await screen.findByDisplayValue('7')).toBeInTheDocument();

    // Resetting drops the override rather than pinning the suggested number,
    // so the accessory starts scaling with the parent again.
    await user.click(screen.getByText('reset to 2'));
    expect(onQuantity).toHaveBeenCalledWith('c1', undefined);
  });

  it('ignores components the rule no longer manages', async () => {
    respondWith(preview({
      components: [
        { productName: 'Kept', qty: 1, action: 'CREATE', unitPricePaise: 100, gstRatePercent: 18 },
        { productName: 'Detached', qty: 1, action: 'DETACH', unitPricePaise: 0, gstRatePercent: 0 },
      ],
    }));
    renderWithQuery(<BundlePreviewNote productId="p1" qty={1} />);

    await screen.findByText(/Kept × 1/);
    // A detached line is no longer part of the bundle, so it must not drag the
    // warning on with it.
    expect(screen.queryByText(/Detached/)).not.toBeInTheDocument();
    expect(screen.queryByText(/added free/)).not.toBeInTheDocument();
  });
});

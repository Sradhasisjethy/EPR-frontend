import { PackagePlus, TriangleAlert, X, Undo2 } from 'lucide-react';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useBundlePreview, useOverrideReasonCodes } from '@/hooks/use-bundles';

/**
 * "Brings 2 × Cable, 1 × Toner" under a line as it is being typed.
 *
 * Read-only — the preview endpoint writes nothing — and shown *before* saving
 * on purpose. A salesperson quoting over the phone needs to know the printer
 * carries a kit while the customer is still on the line, not after the order
 * exists. It stays silent for products with no bundle, so an ordinary order
 * looks exactly as it always did.
 *
 * Each accessory can also be declined here, before the order is saved. Doing it
 * afterwards was the only route at first, which meant a salesperson on the
 * phone had to save an order containing something the customer had just said
 * they did not want — and an unwanted line that survives to a challan is
 * exactly what this feature is supposed to prevent.
 */
export function BundlePreviewNote({
  productId, qty, partyId, factoryId, orderDate,
  overrides = [], onExclude, onRestore, onQuantity,
}) {
  const { data: reasonCodesData } = useOverrideReasonCodes();
  // A secondary lookup must never be able to take down the order form: if it
  // answers with something unexpected, the accessory list still renders and
  // only the remove button goes quiet.
  const reasonCodes = Array.isArray(reasonCodesData) ? reasonCodesData : [];
  const parsedQty = Number(qty);
  const { data } = useBundlePreview(productId, {
    qty: parsedQty > 0 ? parsedQty : 1,
    partyId: partyId || undefined,
    factoryId: factoryId || undefined,
    onDate: orderDate || undefined,
  });

  if (!data?.bundleRuleId) return null;

  const auto = (data.components || []).filter((c) => c.action !== 'DETACH');
  const optional = data.optional || [];
  if (!auto.length && !optional.length) return null;

  // An accessory with no price list entry is added free, and one with no HSN is
  // taxed at 0% — both silently, all the way to the invoice and the GST return.
  // Either can be deliberate (a promotional item, an exempt good), so this is a
  // warning to check rather than a refusal.
  // Placed after `kept` is derived below in spirit: only what is actually going
  // on the order can be mispriced. Recomputed there.

  const byProduct = new Map(overrides.map((o) => [o.componentProductId, o]));
  const excludedIds = new Set(overrides.filter((o) => o.exclude).map((o) => o.componentProductId));

  const kept = auto.filter((c) => !excludedIds.has(c.componentProductId));
  const removed = auto.filter((c) => excludedIds.has(c.componentProductId));

  // What the line will actually carry: the typed number where there is one, and
  // the rule's own otherwise.
  const qtyFor = (c) => {
    const override = byProduct.get(c.componentProductId);
    return override?.qty !== undefined ? override.qty : c.qty;
  };
  const editable = typeof onExclude === 'function';

  // Only what is actually staying can be mispriced or untaxed.
  const unpriced = kept.filter((c) => !Number(c.unitPricePaise));
  const untaxed = kept.filter((c) => !Number(c.gstRatePercent));

  // The first reason that stands on its own — one tap for the common case. The
  // order screen can change it afterwards if the salesperson wants to be
  // specific.
  const defaultReason = reasonCodes.find((r) => !r.requiresNote) || reasonCodes[0];

  return (
    <div className="mt-1 space-y-1">
    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
      <PackagePlus size={12} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {kept.length > 0 && (
          <>
            Brings{' '}
            {kept.map((c, i) => (
              <span key={c.componentProductId} className="inline-flex items-center gap-1 align-middle">
                {i > 0 && <span className="mr-0.5">,</span>}
                {editable && onQuantity ? (
                  <>
                    {/* Name first: the salesperson is looking for the item, and
                        only then adjusting its number. */}
                    <span className="text-foreground">{c.productName || 'item'}</span>
                    <span className="text-muted-foreground">×</span>
                    <QuantityStepper
                      value={qtyFor(c)}
                      onCommit={(next) => onQuantity(c.componentProductId, next)}
                      label={`${c.productName || 'accessory'} quantity`}
                    />
                    {byProduct.get(c.componentProductId)?.qty !== undefined && (
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline"
                        title={`The bundle suggests ${c.qty}`}
                        onClick={() => onQuantity(c.componentProductId, undefined)}
                      >
                        reset to {c.qty}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-foreground">{c.productName || 'item'} × {qtyFor(c)}</span>
                )}
                {editable && defaultReason && (
                  <button
                    type="button"
                    className="align-middle text-muted-foreground hover:text-destructive"
                    title={`Leave ${c.productName || 'this'} off this order`}
                    onClick={() => onExclude({ componentProductId: c.componentProductId, exclude: true, reasonCode: defaultReason.code })}
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
          </>
        )}
        {kept.length === 0 && auto.length > 0 && <>All accessories left off</>}
        {kept.length > 0 && optional.length > 0 && '. '}
        {optional.length > 0 && (
          <>
            {optional.length} optional extra{optional.length === 1 ? '' : 's'} available after saving
          </>
        )}
      </span>
    </p>

      {(unpriced.length > 0 || untaxed.length > 0) && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {unpriced.length > 0 && (
              <>
                No price for{' '}
                <span className="font-medium">{unpriced.map((c) => c.productName).join(', ')}</span> — it
                will be added free.{' '}
              </>
            )}
            {untaxed.length > 0 && (
              <>
                No HSN for{' '}
                <span className="font-medium">{untaxed.map((c) => c.productName).join(', ')}</span> — it
                will be taxed at 0%.
              </>
            )}
          </span>
        </p>
      )}
      {removed.length > 0 && (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 flex-wrap">
          <span>Left off:</span>
          {removed.map((c) => (
            <button
              key={c.componentProductId}
              type="button"
              className="inline-flex items-center gap-1 text-primary hover:underline"
              onClick={() => onRestore?.(c.componentProductId)}
            >
              <Undo2 size={11} />
              {c.productName || 'item'}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

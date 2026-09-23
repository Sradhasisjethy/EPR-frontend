import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSalesOrder, useUpdateSalesOrder } from '@/hooks/use-sales';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { PartyType, ProductType } from '@/constants/enums';
import { toPaise, formatINR } from '@/lib/money';
import { LineAvailability } from '@/components/sales/line-availability';
import { RateSanityHint } from '@/components/sales/rate-sanity-hint';
import { ProductPicker } from '@/components/products/product-picker';
import { BundlePreviewNote } from '@/components/sales/bundle-preview-note';
import { toast } from 'sonner';
import { toInput } from '@/lib/decimal';
import { today } from '@/lib/date-format';

const emptyLine = { productId: '', orderedQty: '', rateRupees: '', accessoryOverrides: [] };

/**
 * Create and edit in one dialog. Editing is DRAFT-only, matching the API:
 * a CONFIRMED order holds stock reservations and may already have dispatches
 * against it, so its lines can no longer be rewritten (see
 * SalesService.updateSalesOrder).
 */
export function SalesOrderFormDialog({ open, onOpenChange, order }) {
  const [form, setForm] = useState({ factoryId: '', customerPartyId: '', orderDate: '', expectedDeliveryDate: '', poReferenceNumber: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [allowOverride, setAllowOverride] = useState(false);

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: customerData } = useParties({ page: 1, limit: 100, partyType: PartyType.CUSTOMER });
  const createMutation = useCreateSalesOrder();
  const updateMutation = useUpdateSalesOrder();
  const isEditing = !!order;
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    if (order) {
      setForm({
        factoryId: order.factoryId || '',
        customerPartyId: order.customerPartyId || '',
        orderDate: order.orderDate || '',
        expectedDeliveryDate: order.expectedDeliveryDate || '',
        poReferenceNumber: order.poReferenceNumber || '',
      });
      // Only the lines a person put here. Accessories are added by the server
      // from the bundle rule, so listing them as editable rows would resubmit
      // them and have expansion add them a second time.
      setLines(
        (order.lines || [])
          .filter((l) => l.lineRole !== 'COMPONENT')
          .map((l) => ({
            productId: l.productId,
            orderedQty: toInput(l.orderedQty),
            accessoryOverrides: [],
            rateRupees: l.ratePaise === null || l.ratePaise === undefined ? '' : String(Number(l.ratePaise) / 100),
          }))
      );
    } else {
      setForm({ factoryId: '', customerPartyId: '', orderDate: today(), expectedDeliveryDate: '', poReferenceNumber: '' });
      setLines([{ ...emptyLine }]);
    }
    setError(''); setWarning(''); setAllowOverride(false);
  }, [open, order]);

  const updateLine = (i, field, value) =>
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        // Exclusions are against a particular product's accessories, so
        // switching the product has to clear them rather than carry them over
        // to a bundle they mean nothing in.
        const cleared = field === 'productId' && value !== l.productId ? { accessoryOverrides: [] } : {};
        return { ...l, [field]: value, ...cleared };
      })
    );

  /** One override per accessory: replaced, or dropped when `next` is null. */
  const setOverride = (i, componentProductId, next) =>
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        const rest = (l.accessoryOverrides || []).filter((o) => o.componentProductId !== componentProductId);
        return { ...l, accessoryOverrides: next ? [...rest, next] : rest };
      })
    );

  const excludeAccessory = (i, exclusion) => setOverride(i, exclusion.componentProductId, exclusion);
  const restoreAccessory = (i, componentProductId) => setOverride(i, componentProductId, null);

  // `undefined` means "back to what the bundle says", so the override goes away
  // rather than being pinned to the suggested number.
  const setAccessoryQty = (i, componentProductId, qty) =>
    setOverride(i, componentProductId, qty === undefined ? null : { componentProductId, qty });
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const submit = (withOverride) => {
    setError(''); setWarning('');
    if (lines.some((l) => !l.productId || !l.orderedQty || l.rateRupees === '')) {
      setError('Every line needs a product, quantity, and rate.');
      return;
    }
    // Duplicates are left to the server. It still refuses a repeated ordinary
    // product, naming it in the message — but a product carrying a bundle is
    // now allowed to appear twice, because two printers can be configured with
    // different accessories, and this check could not tell the two cases apart.

    if (form.expectedDeliveryDate && form.expectedDeliveryDate < form.orderDate) {
      setError('Expected delivery date cannot be earlier than the order date.');
      return;
    }

    const payload = {
      factoryId: form.factoryId,
      customerPartyId: form.customerPartyId,
      orderDate: form.orderDate,
      expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      poReferenceNumber: form.poReferenceNumber || undefined,
      allowCreditOverride: withOverride,
      lines: lines.map((l) => ({
        productId: l.productId,
        orderedQty: Number(l.orderedQty),
        ratePaise: toPaise(l.rateRupees),
        ...(l.accessoryOverrides?.length ? { accessoryOverrides: l.accessoryOverrides } : {}),
      })),
    };

    (isEditing ? updateMutation.mutateAsync({ id: order.id, ...payload }) : createMutation.mutateAsync(payload))
      .then((saved) => {
        if (saved.creditWarning) {
          setWarning(saved.creditWarning);
        }

        // Accessories the rule added are announced, never asked about: a modal
        // on every line would be unusable at the pace an order is typed. The
        // detail view is where they can be adjusted or removed.
        const added = (saved.lines || []).filter((l) => l.lineRole === 'COMPONENT');
        if (added.length) {
          toast.success(
            `${added.length} accessor${added.length === 1 ? 'y' : 'ies'} added with this product`,
            { description: added.map((l) => l.product?.name).filter(Boolean).join(', ') || undefined }
          );
        }

        onOpenChange(false);
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setError(`${err.response.data.message} Retry with credit override if you're authorized.`);
          setAllowOverride(true);
        } else {
          setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} sales order.`);
        }
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${order.orderNumber}` : 'New Sales Order'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm space-y-2">
            <p>{error}</p>
            {allowOverride && (
              <Button type="button" size="sm" variant="outline" onClick={() => submit(true)}>Retry with credit override</Button>
            )}
          </div>
        )}
        {warning && <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-lg text-sm">{warning}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Factory</Label>
              <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} disabled={isEditing} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <select value={form.customerPartyId} onChange={(e) => setForm({ ...form, customerPartyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select customer</option>
                {(customerData?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Expected Delivery Date (optional)</Label>
            <Input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Customer PO Reference (optional)</Label>
            <Input value={form.poReferenceNumber} onChange={(e) => setForm({ ...form, poReferenceNumber: e.target.value })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus size={14} /> Add Line</Button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="space-y-1">
                <div className="grid grid-cols-[minmax(0,1fr)_100px_140px_120px_32px] gap-2 items-center">
                  <ProductPicker
                    value={line.productId}
                    onChange={(id) => updateLine(i, 'productId', id)}
                    filters={{ productType: ProductType.FINISHED_GOOD, status: 'active' }}
                    placeholder="Search products…"
                  />
                  <Input type="number" step="0.01" min="0" placeholder="Qty" value={line.orderedQty} onChange={(e) => updateLine(i, 'orderedQty', e.target.value)} required />
                  <Input type="number" step="0.01" min="0" placeholder="Rate/unit (₹)" value={line.rateRupees} onChange={(e) => updateLine(i, 'rateRupees', e.target.value)} required />
                  <span className="text-sm text-right tabular-nums text-muted-foreground truncate" aria-label={`Line ${i + 1} amount`}>
                    {line.orderedQty && line.rateRupees !== '' ? formatINR(Math.round(Number(line.orderedQty) * toPaise(line.rateRupees))) : ''}
                  </span>
                  <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
                <RateSanityHint productId={line.productId} rateRupees={line.rateRupees} />
                <LineAvailability factoryId={form.factoryId} productId={line.productId} orderedQty={line.orderedQty} />
                <BundlePreviewNote
                  productId={line.productId}
                  qty={line.orderedQty}
                  partyId={form.customerPartyId}
                  factoryId={form.factoryId}
                  orderDate={form.orderDate}
                  overrides={line.accessoryOverrides}
                  onExclude={(exclusion) => excludeAccessory(i, exclusion)}
                  onRestore={(productId) => restoreAccessory(i, productId)}
                  onQuantity={(productId, qty) => setAccessoryQty(i, productId, qty)}
                />
              </div>
            ))}
          </div>

          {lines.some((l) => l.orderedQty && l.rateRupees !== '') && (
            <p className="text-sm text-right">
              Order value{' '}
              <span className="font-semibold tabular-nums">
                {formatINR(lines.reduce((sum, l) => sum + (l.orderedQty && l.rateRupees !== '' ? Math.round(Number(l.orderedQty) * toPaise(l.rateRupees)) : 0), 0))}
              </span>
              <span className="text-muted-foreground"> before GST</span>
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Sales Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Trash2, ShoppingCart, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatUom } from '@/lib/utils';
import { useCreatePurchaseOrder, useUpdatePurchaseOrder, usePurchaseOrder } from '@/hooks/use-purchasing';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useProducts } from '@/hooks/use-products';
import { PartyType } from '@/constants/enums';
import { toPaise, formatINR } from '@/lib/money';
import { toInput } from '@/lib/decimal';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyLine = { productId: '', orderedQty: '', rateRupees: '' };

/**
 * Create, edit, and view purchase orders in one dialog. Editing is DRAFT-only,
 * matching the API: once a purchase order is confirmed the vendor is committed
 * and goods may already be arriving against its lines. Read-only mode provides
 * full inspection of confirmed, received, or cancelled purchase orders.
 */
export function PurchaseOrderFormDialog({ open, onOpenChange, order, readOnly = false }) {
  const [form, setForm] = useState({ factoryId: '', vendorPartyId: '', orderDate: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  const { data: productData } = useProducts({ page: 1, limit: 100 }, { enabled: open });
  const { data: fullOrder, isLoading: loadingOrder } = usePurchaseOrder(open && order?.id ? order.id : undefined);

  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();
  const isEditing = !!order && !readOnly;
  const saving = createMutation.isPending || updateMutation.isPending;

  const target = fullOrder || order;

  const productMap = new Map((productData?.rows || []).map((p) => [p.id, p]));
  // If target order has lines with populated product details, ensure they are in productMap
  (target?.lines || []).forEach((l) => {
    if (l.product && !productMap.has(l.productId)) {
      productMap.set(l.productId, l.product);
    }
  });

  useEffect(() => {
    if (!open) return;

    if (order) {
      setForm({
        factoryId: target?.factoryId || '',
        vendorPartyId: target?.vendorPartyId || target?.vendor?.id || '',
        orderDate: target?.orderDate || '',
      });

      if (target?.lines && target.lines.length > 0) {
        setLines(
          target.lines.map((l) => ({
            productId: l.productId,
            orderedQty: toInput(l.orderedQty),
            rateRupees: l.ratePaise === null || l.ratePaise === undefined ? '' : String(Number(l.ratePaise) / 100),
          }))
        );
      } else if (!loadingOrder && (!target?.lines || target.lines.length === 0)) {
        setLines([{ ...emptyLine }]);
      }
    } else {
      setForm({ factoryId: '', vendorPartyId: '', orderDate: today() });
      setLines([{ ...emptyLine }]);
    }
    setError('');
  }, [open, order, target?.factoryId, target?.vendorPartyId, target?.orderDate, target?.lines, loadingOrder]);

  const updateLine = (i, field, value) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  // Group quantities by Unit of Measure (UoM) to avoid summing mismatched units
  const qtyByUom = lines.reduce((acc, l) => {
    if (!l.productId || !l.orderedQty || Number(l.orderedQty) <= 0) return acc;
    const prod = productMap.get(l.productId);
    const uom = prod?.uom?.code || prod?.uomCode || 'units';
    acc[uom] = (acc[uom] || 0) + Number(l.orderedQty);
    return acc;
  }, {});
  const uomEntries = Object.entries(qtyByUom);

  const totalAmountPaise = lines.reduce((sum, l) => {
    const qty = Number(l.orderedQty) || 0;
    const rate = Number(l.rateRupees) || 0;
    return sum + toPaise(qty * rate);
  }, 0);
  const completedLinesCount = lines.filter((l) => l.productId && Number(l.orderedQty) > 0 && Number(l.rateRupees) >= 0).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    setError('');

    if (!form.factoryId) {
      setError('Please select a target factory.');
      return;
    }

    if (!form.vendorPartyId) {
      setError('Please select a vendor.');
      return;
    }

    if (!form.orderDate) {
      setError('Please select an order date.');
      return;
    }

    if (lines.length === 0 || lines.some((l) => !l.productId || !l.orderedQty || Number(l.orderedQty) <= 0 || l.rateRupees === '')) {
      setError('Every line needs a product, a valid quantity greater than 0, and a rate.');
      return;
    }

    // The API refuses a duplicate product outright; naming it here saves a round trip.
    const ids = lines.map((l) => l.productId);
    const dupe = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dupe) {
      const prod = productMap.get(dupe);
      setError(`The item "${prod?.name || 'Item'}" appears on more than one line — please combine them into a single quantity.`);
      return;
    }

    const payload = {
      factoryId: form.factoryId,
      vendorPartyId: form.vendorPartyId,
      orderDate: form.orderDate,
      lines: lines.map((l) => ({
        productId: l.productId,
        orderedQty: Number(l.orderedQty),
        ratePaise: toPaise(l.rateRupees),
      })),
    };

    (isEditing ? updateMutation.mutateAsync({ id: order.id, ...payload }) : createMutation.mutateAsync(payload))
      .then(() => { toast.success(isEditing ? 'Purchase order updated' : 'Purchase order created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} purchase order.`));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-3 border-b border-border/60 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShoppingCart size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {readOnly
                  ? `Purchase Order #${order?.poNumber || ''}`
                  : isEditing
                  ? `Edit Purchase Order #${order?.poNumber}`
                  : 'New Purchase Order'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {readOnly
                  ? 'View purchase order details, quantities, and vendor pricing.'
                  : isEditing
                  ? 'Update draft order details, quantities, and vendor pricing.'
                  : 'Create a direct purchase order with contracted vendor pricing.'}
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="po-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
          {/* HEADER PARAMETERS CARD */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>📋</span> Order Header Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="po-factory" className="text-xs font-medium">
                  Factory / Plant <span className="text-destructive">*</span>
                </Label>
                <select
                  id="po-factory"
                  value={form.factoryId}
                  onChange={(e) => setForm({ ...form, factoryId: e.target.value })}
                  disabled={isEditing || readOnly}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                >
                  <option value="" disabled>Select factory</option>
                  {(factoryData?.rows || []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="po-vendor" className="text-xs font-medium">
                  Vendor / Supplier <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  id="po-vendor"
                  value={form.vendorPartyId}
                  onChange={(id) => setForm({ ...form, vendorPartyId: id })}
                  useOptions={useParties}
                  filters={{ partyType: PartyType.VENDOR, status: 'active' }}
                  getOptionLabel={(option) => option.name}
                  getOptionHint={(option) => option.code}
                  initialOption={target?.vendor || order?.vendor || null}
                  placeholder="Select vendor"
                  searchPlaceholder="Type a name or code…"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="po-order-date" className="text-xs font-medium">
                  Order Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="po-order-date"
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                  className="h-9 text-sm font-medium"
                  disabled={readOnly}
                  required
                />
              </div>
            </div>
          </div>

          {/* ORDER LINES CARD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold flex items-center gap-1.5">
                  <span>📦</span> Order Line Items
                </Label>
                <p className="text-xs text-muted-foreground">
                  Specify products, order quantities, and agreed unit purchase rates.
                </p>
              </div>
              {!readOnly && (
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 gap-1.5 text-xs font-medium">
                  <Plus size={14} /> Add Line
                </Button>
              )}
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card/40 shadow-sm">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Table Column Headers */}
                  <div className={cn(
                    "grid gap-3 px-4 py-2.5 bg-muted/60 border-b border-border text-xs font-semibold text-muted-foreground items-center",
                    readOnly ? "grid-cols-[44px_1fr_100px_130px_140px_130px]" : "grid-cols-[44px_1fr_100px_130px_140px_130px_44px]"
                  )}>
                    <div className="text-center">#</div>
                    <div>Product / Material <span className="text-destructive">*</span></div>
                    <div className="text-center">UoM</div>
                    <div className="text-right">Ordered Qty <span className="text-destructive">*</span></div>
                    <div className="text-right">Rate (₹) <span className="text-destructive">*</span></div>
                    <div className="text-right">Line Total</div>
                    {!readOnly && <div className="text-center"></div>}
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border/60">
                    {(isEditing || readOnly) && loadingOrder && (!fullOrder?.lines || fullOrder.lines.length === 0) ? (
                      <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                        Loading order line items...
                      </div>
                    ) : (
                      lines.map((line, i) => {
                        const prod = productMap.get(line.productId);
                        const uomCode = prod?.uom?.code || prod?.uomCode || '—';
                        const qty = Number(line.orderedQty) || 0;
                        const rate = Number(line.rateRupees) || 0;
                        const lineTotalPaise = toPaise(qty * rate);

                        return (
                          <div key={i} className="p-2.5 px-4 hover:bg-muted/20 transition-colors">
                            <div className={cn(
                              "grid gap-3 items-center",
                              readOnly ? "grid-cols-[44px_1fr_100px_130px_140px_130px]" : "grid-cols-[44px_1fr_100px_130px_140px_130px_44px]"
                            )}>
                              {/* Row Index */}
                              <div className="text-center text-xs font-mono font-medium text-muted-foreground">
                                {i + 1}
                              </div>

                              {/* Product Select */}
                              <div>
                                <select
                                  value={line.productId}
                                  onChange={(e) => updateLine(i, 'productId', e.target.value)}
                                  disabled={readOnly}
                                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary truncate disabled:opacity-80 disabled:cursor-not-allowed"
                                  required
                                >
                                  <option value="" disabled>Select product...</option>
                                  {(productData?.rows || []).map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.code ? `[${p.code}] ` : ''}{p.name}
                                    </option>
                                  ))}
                                  {line.productId && !productData?.rows?.some((p) => p.id === line.productId) && prod && (
                                    <option value={line.productId}>
                                      {prod.code ? `[${prod.code}] ` : ''}{prod.name}
                                    </option>
                                  )}
                                </select>
                              </div>

                              {/* UoM Pill */}
                              <div className="text-center">
                                <span className={cn(
                                  "inline-flex items-center justify-center px-2 py-1 rounded text-xs font-mono border border-border/60 w-full truncate",
                                  prod ? "bg-muted/80 text-foreground font-medium" : "bg-muted/30 text-muted-foreground"
                                )}>
                                  {uomCode}
                                </span>
                              </div>

                              {/* Quantity Input */}
                              <div>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  placeholder="Qty"
                                  value={line.orderedQty}
                                  onChange={(e) => updateLine(i, 'orderedQty', e.target.value)}
                                  className="h-9 text-right font-mono text-sm disabled:opacity-80 disabled:cursor-not-allowed"
                                  disabled={readOnly}
                                  required
                                />
                              </div>

                              {/* Rate Input */}
                              <div>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={line.rateRupees}
                                  onChange={(e) => updateLine(i, 'rateRupees', e.target.value)}
                                  className="h-9 text-right font-mono text-sm disabled:opacity-80 disabled:cursor-not-allowed"
                                  disabled={readOnly}
                                  required
                                />
                              </div>

                              {/* Line Total */}
                              <div className="text-right font-mono text-sm font-bold text-foreground">
                                {qty > 0 && rate > 0 ? formatINR(lineTotalPaise) : '—'}
                              </div>

                              {/* Delete Action */}
                              {!readOnly && (
                                <div className="flex justify-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeLine(i)}
                                    disabled={lines.length === 1}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 shadow-sm">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Total Line Items</span>
              <span className="text-sm font-bold tabular-nums">
                {lines.length} {lines.length === 1 ? 'item' : 'items'} {completedLinesCount > 0 && `(${completedLinesCount} ready)`}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">
                {uomEntries.length <= 1 ? 'Total Ordered Quantity' : 'Ordered Quantity by UoM'}
              </span>
              {uomEntries.length === 0 ? (
                <span className="text-sm font-bold tabular-nums text-muted-foreground">—</span>
              ) : uomEntries.length === 1 ? (
                <span className="text-sm font-bold tabular-nums font-mono">
                  {uomEntries[0][1].toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  <span className="ml-1 text-xs font-sans text-foreground/80 font-normal">
                    {formatUom(uomEntries[0][0], uomEntries[0][1])}
                  </span>
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {uomEntries.map(([uom, qty]) => (
                    <span
                      key={uom}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 font-mono text-xs font-semibold border border-border/80"
                    >
                      {qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      <span className="ml-1 text-[11px] font-sans text-foreground/80 font-normal">
                        {formatUom(uom, qty)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] font-medium text-muted-foreground block">Total Order Amount</span>
              <span className="text-base font-bold font-mono text-primary">
                {formatINR(totalAmountPaise)}
              </span>
            </div>
          </div>
        </form>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {readOnly ? (
              <span>Order Status: <strong className="text-foreground">{order?.status}</strong></span>
            ) : (
              <span>Orders can be edited while in DRAFT status.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {readOnly ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="po-form"
                  disabled={saving}
                  className="font-semibold px-5"
                >
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Purchase Order'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


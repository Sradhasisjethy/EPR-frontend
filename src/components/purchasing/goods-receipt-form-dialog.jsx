import { useEffect, useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCreateGoodsReceipt, usePurchaseOrders, usePurchaseOrder } from '@/hooks/use-purchasing';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useProducts } from '@/hooks/use-products';
import { PartyType } from '@/constants/enums';
import { fromPaise, toPaise, formatINR } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyLine = { productId: '', receivedQty: '', rejectedQty: '', rejectionReason: '', rateRupees: '', purchaseOrderLineId: '' };

export function GoodsReceiptFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', vendorPartyId: '', purchaseOrderId: '', receiptDate: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: vendorData } = useParties({ page: 1, limit: 100, partyType: PartyType.VENDOR });
  const { data: productData } = useProducts({ page: 1, limit: 100 });
  const { data: openOrders } = usePurchaseOrders({ page: 1, limit: 100, factoryId: form.factoryId || undefined, status: 'CONFIRMED' });
  const { data: partiallyReceivedOrders } = usePurchaseOrders({ page: 1, limit: 100, factoryId: form.factoryId || undefined, status: 'PARTIALLY_RECEIVED' });
  const { data: selectedPo } = usePurchaseOrder(form.purchaseOrderId || undefined);
  const createMutation = useCreateGoodsReceipt();

  const eligiblePos = [...(openOrders?.rows || []), ...(partiallyReceivedOrders?.rows || [])];
  const productMap = new Map((productData?.rows || []).map((p) => [p.id, p]));

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', vendorPartyId: '', purchaseOrderId: '', receiptDate: today() });
      setLines([{ ...emptyLine }]);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (selectedPo) {
      setForm((f) => ({ ...f, vendorPartyId: selectedPo.vendorPartyId }));
      setLines(
        selectedPo.lines
          .filter((l) => Number(l.receivedQty) < Number(l.orderedQty))
          .map((l) => ({
            productId: l.productId,
            receivedQty: String(Number(l.orderedQty) - Number(l.receivedQty)),
            rejectedQty: '',
            rejectionReason: '',
            rateRupees: fromPaise(l.ratePaise),
            purchaseOrderLineId: l.id,
          }))
      );
    }
  }, [selectedPo]);

  const updateLine = (i, field, value) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  // Computations for summary metrics
  const totalReceived = lines.reduce((sum, l) => sum + (Number(l.receivedQty) || 0), 0);
  const totalRejected = lines.reduce((sum, l) => sum + (Number(l.rejectedQty) || 0), 0);
  const totalAccepted = Math.max(0, totalReceived - totalRejected);
  const totalValuePaise = lines.reduce((sum, l) => {
    const acc = Math.max(0, (Number(l.receivedQty) || 0) - (Number(l.rejectedQty) || 0));
    return sum + Math.round(acc * toPaise(l.rateRupees));
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (lines.some((l) => !l.productId || !l.receivedQty || l.rateRupees === '')) {
      setError('Every line needs a product, received quantity, and unit rate.');
      return;
    }
    if (lines.some((l) => Number(l.rejectedQty || 0) > Number(l.receivedQty || 0))) {
      setError('A line cannot reject more quantity than was received.');
      return;
    }
    if (lines.some((l) => Number(l.rejectedQty || 0) > 0 && !l.rejectionReason.trim())) {
      setError('Please provide a rejection reason for any line with rejected quantity.');
      return;
    }

    const payload = {
      factoryId: form.factoryId,
      vendorPartyId: form.vendorPartyId,
      purchaseOrderId: form.purchaseOrderId || undefined,
      receiptDate: form.receiptDate,
      lines: lines.map((l) => ({
        productId: l.productId,
        receivedQty: Number(l.receivedQty),
        rejectedQty: Number(l.rejectedQty || 0) > 0 ? Number(l.rejectedQty) : undefined,
        rejectionReason: Number(l.rejectedQty || 0) > 0 ? l.rejectionReason.trim() : undefined,
        ratePaise: toPaise(l.rateRupees),
        purchaseOrderLineId: l.purchaseOrderLineId || undefined,
      })),
    };

    createMutation
      .mutateAsync(payload)
      .then(() => { toast.success('Goods receipt recorded'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to post goods receipt.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-3 border-b border-border/60 shrink-0 bg-background">
          <DialogTitle className="text-xl font-bold">New Goods Receipt (GRN)</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Posting this immediately creates stock lots and financial valuation entries (BR-01, BR-02).
          </p>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0">
            {error}
          </div>
        )}

        <form id="grn-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
          {/* HEADER PARAMETERS CARD */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span>📥</span> Receipt Header & Source PO
              </h4>
              {form.purchaseOrderId && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Linked to Purchase Order
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="grn-factory" className="text-xs font-medium">
                  Destination Factory <span className="text-destructive">*</span>
                </Label>
                <select
                  id="grn-factory"
                  value={form.factoryId}
                  onChange={(e) => setForm({ ...form, factoryId: e.target.value, purchaseOrderId: '' })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="" disabled>Select factory</option>
                  {(factoryData?.rows || []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grn-po" className="text-xs font-medium">
                  Against Purchase Order (optional)
                </Label>
                <select
                  id="grn-po"
                  value={form.purchaseOrderId}
                  onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                >
                  <option value="">Direct receipt (no PO)</option>
                  {eligiblePos.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.vendor?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grn-vendor" className="text-xs font-medium">
                  Supplier / Vendor <span className="text-destructive">*</span>
                </Label>
                <select
                  id="grn-vendor"
                  value={form.vendorPartyId}
                  onChange={(e) => setForm({ ...form, vendorPartyId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                  required
                  disabled={!!form.purchaseOrderId}
                >
                  <option value="" disabled>Select vendor</option>
                  {(vendorData?.rows || []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grn-date" className="text-xs font-medium">
                  Receipt Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="grn-date"
                  type="date"
                  value={form.receiptDate}
                  onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
                  className="h-9 text-sm font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* LINES SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold flex items-center gap-1.5">
                  <span>📦</span> Received Material Lines
                </Label>
                <p className="text-xs text-muted-foreground">
                  Accepted quantity will be taken into stock lots; rejected material is excluded from inventory.
                </p>
              </div>
              {!form.purchaseOrderId && (
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 gap-1.5 text-xs font-medium">
                  <Plus size={14} /> Add Line
                </Button>
              )}
            </div>

            {/* Structured Lines Container */}
            <div className="border border-border rounded-xl overflow-hidden bg-card/40 shadow-sm">
              <div className="overflow-x-auto">
                <div className="min-w-[840px]">
                  {/* Table Column Headers */}
                  <div className="grid grid-cols-[1fr_80px_110px_110px_100px_130px_120px_40px] gap-2.5 px-4 py-2.5 bg-muted/60 border-b border-border text-xs font-semibold text-muted-foreground items-center">
                    <div>Product / Material <span className="text-destructive">*</span></div>
                    <div className="text-center">UoM</div>
                    <div className="text-right">Received <span className="text-destructive">*</span></div>
                    <div className="text-right">Rejected</div>
                    <div className="text-right">Accepted</div>
                    <div className="text-right">Unit Rate (₹) <span className="text-destructive">*</span></div>
                    <div className="text-right">Line Total</div>
                    <div className="text-center"></div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border/60">
                    {lines.map((line, i) => {
                      const prod = productMap.get(line.productId);
                      const uomCode = prod?.uom?.code || 'units';
                      const received = Number(line.receivedQty) || 0;
                      const rejected = Number(line.rejectedQty) || 0;
                      const accepted = Math.max(0, received - rejected);
                      const rate = Number(line.rateRupees) || 0;
                      const lineTotal = accepted * rate;

                      return (
                        <div key={i} className="p-3 px-4 hover:bg-muted/20 transition-colors space-y-2">
                          <div className="grid grid-cols-[1fr_80px_110px_110px_100px_130px_120px_40px] gap-2.5 items-center">
                            {/* Product Select */}
                            <div>
                              <select
                                value={line.productId}
                                onChange={(e) => updateLine(i, 'productId', e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary truncate"
                                required
                                disabled={!!line.purchaseOrderLineId}
                              >
                                <option value="" disabled>Select product...</option>
                                {(productData?.rows || []).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} {p.code ? `(${p.code})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* UoM */}
                            <div className="text-center">
                              <span className="inline-block px-2 py-1 rounded bg-muted text-[11px] font-mono font-semibold text-muted-foreground">
                                {prod?.uom?.code || '—'}
                              </span>
                            </div>

                            {/* Received Qty */}
                            <div>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                value={line.receivedQty}
                                onChange={(e) => updateLine(i, 'receivedQty', e.target.value)}
                                className="h-9 text-xs sm:text-sm text-right tabular-nums font-medium"
                                required
                              />
                            </div>

                            {/* Rejected Qty */}
                            <div>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                value={line.rejectedQty}
                                onChange={(e) => updateLine(i, 'rejectedQty', e.target.value)}
                                className={cn(
                                  "h-9 text-xs sm:text-sm text-right tabular-nums font-medium transition-colors",
                                  rejected > 0 && "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                                )}
                              />
                            </div>

                            {/* Accepted Qty (Calculated) */}
                            <div className="text-right tabular-nums px-2 py-1.5 rounded bg-muted/50 font-semibold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              {accepted > 0 ? accepted.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '0.00'}
                            </div>

                            {/* Rate (₹) */}
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-muted-foreground text-xs font-semibold">₹</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={line.rateRupees}
                                onChange={(e) => updateLine(i, 'rateRupees', e.target.value)}
                                className="h-9 text-xs sm:text-sm pl-6 text-right tabular-nums font-medium"
                                required
                              />
                            </div>

                            {/* Line Total (₹) */}
                            <div className="text-right tabular-nums px-2 py-1.5 font-semibold text-xs sm:text-sm text-foreground">
                              {lineTotal > 0 ? formatINR(Math.round(lineTotal * 100)) : '₹0.00'}
                            </div>

                            {/* Remove Action */}
                            <div className="text-center">
                              {!form.purchaseOrderId && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(i)}
                                  disabled={lines.length === 1}
                                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                  title="Remove line"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Rejection Notice & Mandatory Reason Input */}
                          {rejected > 0 && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5 animate-in fade-in-50 duration-150">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                <AlertTriangle size={14} className="shrink-0" />
                                <span>Rejection Notice: {rejected} {uomCode} rejected. Only {accepted} {uomCode} will be stocked into inventory.</span>
                              </div>
                              <div>
                                <Input
                                  placeholder="Reason for rejection (e.g. Damaged packaging, moisture ingress, failed laboratory QC check)..."
                                  value={line.rejectionReason}
                                  onChange={(e) => updateLine(i, 'rejectionReason', e.target.value)}
                                  required
                                  className="h-8 text-xs bg-background border-amber-500/40 focus:border-amber-500 placeholder:text-muted-foreground/70"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 shadow-sm">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Total Received Qty</span>
              <span className="text-sm font-bold tabular-nums">
                {totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Total Rejected Qty</span>
              <span className={cn("text-sm font-bold tabular-nums", totalRejected > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
                {totalRejected.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Net Stocked Qty</span>
              <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {totalAccepted.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Total Inward Value</span>
              <span className="text-sm font-bold tabular-nums text-primary">
                {formatINR(totalValuePaise)}
              </span>
            </div>
          </div>
        </form>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            <span>Inventory stock lots and general ledger vouchers are generated on confirmation.</span>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="grn-form" disabled={createMutation.isPending} className="font-semibold px-5">
              {createMutation.isPending ? 'Posting Receipt...' : 'Post Goods Receipt'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

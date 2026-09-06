import { useEffect, useState } from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toPaise, formatINR } from '@/lib/money';
import { useConvertIndent } from '@/hooks/use-indents';
import { useParties } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

/** Converts an approved indent into a PO, capturing the rate for every line. */
export function ConvertIndentDialog({ open, onOpenChange, indent }) {
  const [vendorPartyId, setVendorPartyId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [rates, setRates] = useState({});
  const [error, setError] = useState('');

  const { data: vendorData } = useParties({ page: 1, limit: 100, partyType: PartyType.VENDOR });
  const convert = useConvertIndent();

  useEffect(() => {
    if (open) {
      setVendorPartyId('');
      setOrderDate(today());
      setRates({});
      setError('');
    }
  }, [open]);

  // Calculate estimated total
  const totalAmountPaise = (indent?.lines || []).reduce((sum, line) => {
    const rate = Number(rates[line.productId]) || 0;
    const qty = Number(line.quantity) || 0;
    return sum + toPaise(rate * qty);
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!vendorPartyId) {
      setError('Please select a vendor for this purchase order.');
      return;
    }

    if (!orderDate) {
      setError('Please select an order date.');
      return;
    }

    const missing = (indent?.lines || []).filter((l) => !rates[l.productId] || Number(rates[l.productId]) <= 0);
    if (missing.length) {
      setError('Enter a valid rate (> 0) for every line — the purchase order cannot be priced without them.');
      return;
    }

    convert
      .mutateAsync({
        id: indent.id,
        vendorPartyId,
        orderDate,
        lineRates: indent.lines.map((l) => ({ productId: l.productId, ratePaise: toPaise(rates[l.productId]) })),
      })
      .then(() => { toast.success('Purchase order created from indent'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to convert the indent.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[calc(100vh-60px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShoppingCart size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Convert Indent #{indent?.indentNumber} to Purchase Order
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assign a vendor and agreed unit purchase rates to generate the confirmed Purchase Order.
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

        <form id="convert-indent-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* PO PARAMETERS */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>🏢</span> Purchase Order Header
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="convert-vendor" className="text-xs font-medium">
                  Vendor / Supplier <span className="text-destructive">*</span>
                </Label>
                <select
                  id="convert-vendor"
                  value={vendorPartyId}
                  onChange={(e) => setVendorPartyId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="" disabled>Select supplier</option>
                  {(vendorData?.rows || []).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="convert-order-date" className="text-xs font-medium">
                  Order Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="convert-order-date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="h-9 text-sm font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* ITEM RATES TABLE */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-bold flex items-center gap-1.5">
                <span>💰</span> Agreed Purchase Rates
              </Label>
              <p className="text-xs text-muted-foreground">
                Enter the unit price for each requisition line agreed with the supplier.
              </p>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card/40 shadow-sm">
              <div className="overflow-x-auto">
                <div className="min-w-[550px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_100px_130px_120px] gap-3 px-4 py-2.5 bg-muted/60 border-b border-border text-xs font-semibold text-muted-foreground items-center">
                    <div>Product / Material</div>
                    <div className="text-right">Indent Qty</div>
                    <div className="text-right">Unit Rate (₹) <span className="text-destructive">*</span></div>
                    <div className="text-right">Line Total (₹)</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border/60">
                    {(indent?.lines || []).map((line) => {
                      const qty = Number(line.quantity) || 0;
                      const rate = Number(rates[line.productId]) || 0;
                      const lineTotalPaise = toPaise(qty * rate);

                      return (
                        <div key={line.id} className="p-2.5 px-4 hover:bg-muted/20 transition-colors">
                          <div className="grid grid-cols-[1fr_100px_130px_120px] gap-3 items-center">
                            <div>
                              <div className="text-sm font-medium">{line.product?.name}</div>
                              {line.product?.code && (
                                <div className="text-xs text-muted-foreground font-mono">{line.product.code}</div>
                              )}
                            </div>

                            <div className="text-right font-mono text-sm font-medium">
                              {qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                              <span className="text-xs text-muted-foreground ml-1">
                                {line.product?.uom?.code || ''}
                              </span>
                            </div>

                            <div>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                value={rates[line.productId] ?? ''}
                                onChange={(e) => setRates({ ...rates, [line.productId]: e.target.value })}
                                className="h-9 text-right font-mono text-sm font-medium"
                                required
                              />
                            </div>

                            <div className="text-right font-mono text-sm font-bold text-foreground">
                              {rate > 0 ? formatINR(lineTotalPaise) : '—'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TOTAL ESTIMATION CARD */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30 shadow-sm">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Estimated PO Value
            </span>
            <span className="text-lg font-bold font-mono text-primary">
              {formatINR(totalAmountPaise)}
            </span>
          </div>
        </form>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="convert-indent-form"
            disabled={convert.isPending}
            className="font-semibold px-5"
          >
            {convert.isPending ? 'Converting...' : 'Create Purchase Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


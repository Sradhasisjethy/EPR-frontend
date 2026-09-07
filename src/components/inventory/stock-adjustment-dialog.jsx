import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateStockAdjustment } from '@/hooks/use-inventory';
import { toast } from 'sonner';

/**
 * Records a physical stock count against one lot.
 *
 * The form asks for the counted quantity, not the difference. That is
 * deliberate and matches the API: the server reads the system quantity under
 * the same row lock it posts with, so two people counting the same lot cannot
 * both apply a delta computed against a stale number. Showing the difference
 * live keeps that honest without making the user do the arithmetic.
 */
export function StockAdjustmentDialog({ open, onOpenChange, lot }) {
  const [countedQty, setCountedQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const mutation = useCreateStockAdjustment();

  useEffect(() => {
    if (open) {
      setCountedQty('');
      setReason('');
      setError('');
    }
  }, [open, lot]);

  if (!lot) return null;

  const systemQty = Number(lot.qtyAvailable ?? 0);
  const counted = countedQty === '' ? null : Number(countedQty);
  const delta = counted === null || Number.isNaN(counted) ? null : Number((counted - systemQty).toFixed(4));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (counted === null || Number.isNaN(counted) || counted < 0) {
      setError('Enter the quantity you counted — zero or more.');
      return;
    }
    if (delta === 0) {
      setError('The counted quantity already matches the system quantity, so there is nothing to correct.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('A reason is required — an unexplained stock correction is not auditable.');
      return;
    }

    mutation
      .mutateAsync({
        factoryId: lot.factoryId,
        productId: lot.productId,
        lotId: lot.id,
        countedQty: counted,
        reason: reason.trim(),
      })
      .then(() => { toast.success('Stock adjusted'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to record the adjustment.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {lot.lotNumber}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-3 rounded-lg border border-border bg-muted/30 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">System quantity</p>
              <p className="font-medium tabular-nums">{systemQty}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Counted</p>
              <p className="font-medium tabular-nums">{counted === null || Number.isNaN(counted) ? '—' : counted}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Difference</p>
              <p
                className={
                  delta === null || delta === 0
                    ? 'font-medium tabular-nums'
                    : delta > 0
                      ? 'font-medium tabular-nums text-emerald-600'
                      : 'font-medium tabular-nums text-destructive'
                }
              >
                {delta === null || Number.isNaN(delta) ? '—' : delta > 0 ? `+${delta}` : delta}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="counted-qty">Counted quantity</Label>
            <Input
              id="counted-qty"
              type="number"
              step="0.0001"
              min="0"
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
              placeholder="What did you physically count?"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason</Label>
            <Input
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Quarterly count — 8 units broken in storage"
              required
            />
            <p className="text-xs text-muted-foreground">
              Recorded permanently against this lot, with your name and the before and after quantities.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Recording...' : 'Record Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

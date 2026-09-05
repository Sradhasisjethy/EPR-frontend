import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateChallan } from '@/hooks/use-dispatch';
import { useSalesOrders, useSalesOrder } from '@/hooks/use-sales';
import { toInput } from '@/lib/decimal';

export function CreateChallanDialog({ open, onOpenChange }) {
  const [salesOrderId, setSalesOrderId] = useState('');
  const [form, setForm] = useState({ vehicleNumber: '', driverName: '', dispatchDate: '' });
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');

  const { data: ordersData } = useSalesOrders({ page: 1, limit: 100 });
  const dispatchableOrders = (ordersData?.rows || []).filter((o) => ['CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_DISPATCHED'].includes(o.status));
  const { data: order } = useSalesOrder(salesOrderId || undefined);
  const createMutation = useCreateChallan();

  useEffect(() => {
    if (open) {
      setSalesOrderId('');
      setForm({ vehicleNumber: '', driverName: '', dispatchDate: new Date().toISOString().slice(0, 10) });
      setQuantities({});
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (order) {
      setQuantities(
        Object.fromEntries(
          order.lines
            .filter((l) => Number(l.dispatchedQty) < Number(l.orderedQty))
            .map((l) => [l.id, toInput(Number(l.orderedQty) - Number(l.dispatchedQty))])
        )
      );
    }
  }, [order]);

  const remainingLines = (order?.lines || []).filter((l) => Number(l.dispatchedQty) < Number(l.orderedQty));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const lines = remainingLines
      .filter((l) => Number(quantities[l.id]) > 0)
      .map((l) => ({ salesOrderLineId: l.id, dispatchedQty: Number(quantities[l.id]) }));

    if (!lines.length) {
      setError('Enter a dispatch quantity for at least one line.');
      return;
    }

    const payload = { salesOrderId, vehicleNumber: form.vehicleNumber, driverName: form.driverName || undefined, dispatchDate: form.dispatchDate, lines };
    createMutation.mutateAsync(payload).then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to dispatch challan.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Delivery Challan</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sales Order</Label>
            <select value={salesOrderId} onChange={(e) => setSalesOrderId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select an order ready to dispatch</option>
              {dispatchableOrders.map((o) => (
                <option key={o.id} value={o.id}>{o.orderNumber} — {o.customer?.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Vehicle No.</Label>
              <Input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Driver Name</Label>
              <Input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Dispatch Date</Label>
              <Input type="date" value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} required />
            </div>
          </div>

          {order && (
            <div className="space-y-2">
              <Label>Lines (stock consumed FIFO by lot — BR-03)</Label>
              {remainingLines.length === 0 && <p className="text-sm text-muted-foreground">Every line on this order is already fully dispatched.</p>}
              {remainingLines.map((line) => {
                const remaining = Number(line.orderedQty) - Number(line.dispatchedQty);
                return (
                  <div key={line.id} className="grid grid-cols-[1fr_120px] gap-2 items-center text-sm">
                    <span>{line.product?.name} — remaining {remaining}</span>
                    <Input
                      type="number" step="0.01" min="0" max={remaining}
                      value={quantities[line.id] ?? ''}
                      onChange={(e) => setQuantities({ ...quantities, [line.id]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !order}>{createMutation.isPending ? 'Dispatching...' : 'Dispatch'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

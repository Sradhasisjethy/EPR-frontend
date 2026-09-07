import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateInvoice } from '@/hooks/use-invoicing';
import { useSalesOrders } from '@/hooks/use-sales';
import { useDeliveryChallans } from '@/hooks/use-dispatch';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

export function CreateInvoiceDialog({ open, onOpenChange }) {
  const [salesOrderId, setSalesOrderId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [selectedChallanIds, setSelectedChallanIds] = useState([]);
  const [error, setError] = useState('');

  const { data: ordersData } = useSalesOrders({ page: 1, limit: 100 });
  const invoiceableOrders = (ordersData?.rows || []).filter((o) => ['CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_DISPATCHED', 'DISPATCHED'].includes(o.status));
  const { data: challansData } = useDeliveryChallans({ salesOrderId: salesOrderId || undefined, status: 'DISPATCHED', limit: 100 });
  const eligibleChallans = (challansData?.rows || []).filter((c) => !c.invoiced);
  const createMutation = useCreateInvoice();

  useEffect(() => {
    if (open) {
      setSalesOrderId('');
      setInvoiceDate(today());
      setSelectedChallanIds([]);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    setSelectedChallanIds([]);
  }, [salesOrderId]);

  const toggleChallan = (id) => {
    setSelectedChallanIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedChallanIds.length) {
      setError('Select at least one delivery challan to invoice.');
      return;
    }

    createMutation
      .mutateAsync({ challanIds: selectedChallanIds, invoiceDate })
      .then(() => { toast.success('Invoice created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to create invoice.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Sales Invoice</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Sales Order</Label>
              <select value={salesOrderId} onChange={(e) => setSalesOrderId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select an order with dispatched challans</option>
                {invoiceableOrders.map((o) => (
                  <option key={o.id} value={o.id}>{o.orderNumber} — {o.customer?.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            </div>
          </div>

          {salesOrderId && (
            <div className="space-y-2">
              <Label>Delivery Challans (GST computed automatically — CGST+SGST if same state, else IGST)</Label>
              {eligibleChallans.length === 0 && <p className="text-sm text-muted-foreground">No un-invoiced dispatched challans for this order.</p>}
              {eligibleChallans.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm p-2 rounded-md border border-input">
                  <input type="checkbox" checked={selectedChallanIds.includes(c.id)} onChange={() => toggleChallan(c.id)} />
                  <span>{c.challanNumber} — {c.vehicleNumber} — {c.dispatchDate}</span>
                </label>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Invoice'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

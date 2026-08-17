import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePurchaseInvoice } from '@/hooks/use-purchasing';
import { useGoodsReceipts } from '@/hooks/use-purchasing';
import { toPaise } from '@/lib/money';

const emptyForm = { goodsReceiptId: '', vendorInvoiceNumber: '', invoiceDate: '', dueDate: '', amountRupees: '' };

export function PurchaseInvoiceFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data: receiptData } = useGoodsReceipts({ page: 1, limit: 100 });
  const createMutation = useCreatePurchaseInvoice();

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, invoiceDate: new Date().toISOString().slice(0, 10) });
      setError('');
    }
  }, [open]);

  const selectedReceipt = (receiptData?.rows || []).find((r) => r.id === form.goodsReceiptId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!selectedReceipt) {
      setError('Select the goods receipt this invoice bills.');
      return;
    }

    const payload = {
      factoryId: selectedReceipt.factoryId,
      goodsReceiptId: form.goodsReceiptId,
      vendorPartyId: selectedReceipt.vendorPartyId,
      vendorInvoiceNumber: form.vendorInvoiceNumber,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate || undefined,
      amountPaise: toPaise(form.amountRupees),
    };

    createMutation.mutateAsync(payload).then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to save purchase invoice.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Purchase Invoice</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Goods Receipt</Label>
            <select value={form.goodsReceiptId} onChange={(e) => setForm({ ...form, goodsReceiptId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select GRN</option>
              {(receiptData?.rows || []).map((r) => <option key={r.id} value={r.id}>{r.grnNumber} — {r.vendor?.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vendor Invoice No.</Label>
              <Input value={form.vendorInvoiceNumber} onChange={(e) => setForm({ ...form, vendorInvoiceNumber: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" min="0" value={form.amountRupees} onChange={(e) => setForm({ ...form, amountRupees: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Date</Label>
              <Input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create Invoice'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

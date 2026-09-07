import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePurchaseReturn } from '@/hooks/use-returns';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useProducts } from '@/hooks/use-products';
import { PartyType } from '@/constants/enums';
import { toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyLine = { productId: '', quantity: '', rateRupees: '' };

export function PurchaseReturnFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', vendorPartyId: '', returnDate: '', reason: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: vendorData } = useParties({ page: 1, limit: 100, partyType: PartyType.VENDOR });
  const { data: productData } = useProducts({ page: 1, limit: 100 });
  const createMutation = useCreatePurchaseReturn();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', vendorPartyId: '', returnDate: today(), reason: '' });
      setLines([{ ...emptyLine }]);
      setError('');
    }
  }, [open]);

  const updateLine = (i, field, value) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (lines.some((l) => !l.productId || !l.quantity || l.rateRupees === '')) {
      setError('Every line needs a product, quantity, and rate.');
      return;
    }

    const payload = {
      ...form,
      lines: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), ratePaise: toPaise(l.rateRupees) })),
    };

    createMutation.mutateAsync(payload).then(() => { toast.success('Purchase return recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to record purchase return.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Purchase Return</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Factory</Label>
              <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <select value={form.vendorPartyId} onChange={(e) => setForm({ ...form, vendorPartyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select vendor</option>
                {(vendorData?.rows || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Return Date</Label>
              <Input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. quality reject" required minLength={3} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lines (consumed FIFO from stock — BR-03)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus size={14} /> Add Line</Button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
                <select value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)} className="h-9 px-2 rounded-md border border-input bg-background text-sm" required>
                  <option value="" disabled>Product</option>
                  {(productData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Input type="number" step="0.01" min="0" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} required />
                <Input type="number" step="0.01" min="0" placeholder="Rate (₹)" value={line.rateRupees} onChange={(e) => updateLine(i, 'rateRupees', e.target.value)} required />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Record Return'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

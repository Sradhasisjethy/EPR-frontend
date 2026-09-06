import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWastage } from '@/hooks/use-production';
import { useFactories } from '@/hooks/use-factory';
import { useStockLots } from '@/hooks/use-inventory';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyForm = { factoryId: '', lotId: '', stage: 'STACKING', quantity: '', reason: '', recordedDate: '' };

export function WastageFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: lotData } = useStockLots({ page: 1, limit: 100, factoryId: form.factoryId || undefined, status: 'AVAILABLE' });
  const createMutation = useCreateWastage();

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, recordedDate: today() });
      setError('');
    }
  }, [open]);

  const selectedLot = (lotData?.rows || []).find((l) => l.id === form.lotId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!selectedLot) {
      setError('Select the lot this wastage applies to.');
      return;
    }

    const payload = {
      factoryId: form.factoryId,
      productId: selectedLot.productId,
      lotId: form.lotId,
      stage: form.stage,
      quantity: Number(form.quantity),
      reason: form.reason,
      recordedDate: form.recordedDate,
    };

    createMutation.mutateAsync(payload).then(() => { toast.success('Wastage recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to record wastage.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Wastage / Breakage</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <p className="text-xs text-muted-foreground -mt-2">Recorded, not silently absorbed — reduces the selected lot's stock immediately.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Factory</Label>
              <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value, lotId: '' })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="DEMOULDING">Demoulding</option>
                <option value="STACKING">Stacking</option>
                <option value="HANDLING">Handling</option>
                <option value="TRANSIT">Transit</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Lot</Label>
            <select value={form.lotId} onChange={(e) => setForm({ ...form, lotId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select lot</option>
              {(lotData?.rows || []).map((l) => (
                <option key={l.id} value={l.id}>{l.lotNumber} — {l.product?.name} ({l.qtyAvailable} avail)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" step="0.01" min="0" max={selectedLot?.qtyAvailable} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.recordedDate} onChange={(e) => setForm({ ...form, recordedDate: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required minLength={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Record Wastage'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

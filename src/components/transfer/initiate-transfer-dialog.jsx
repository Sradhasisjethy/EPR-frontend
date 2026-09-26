import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitiateTransfer } from '@/hooks/use-transfer';
import { useFactories } from '@/hooks/use-factory';
import { useStockLots } from '@/hooks/use-inventory';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyLine = { productId: '', sourceLotId: '', quantity: '' };

export function InitiateTransferDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ fromFactoryId: '', toFactoryId: '', vehicleNumber: '', initiatedDate: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  const { data: lotData } = useStockLots({ page: 1, limit: 100, factoryId: form.fromFactoryId || undefined, status: 'AVAILABLE' });
  const initiateMutation = useInitiateTransfer();

  useEffect(() => {
    if (open) {
      setForm({ fromFactoryId: '', toFactoryId: '', vehicleNumber: '', initiatedDate: today() });
      setLines([{ ...emptyLine }]);
      setError('');
    }
  }, [open]);

  const updateLine = (i, field, value) => {
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        if (field === 'sourceLotId') {
          const lot = (lotData?.rows || []).find((x) => x.id === value);
          return { ...l, sourceLotId: value, productId: lot?.productId || '' };
        }
        return { ...l, [field]: value };
      })
    );
  };
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.fromFactoryId === form.toFactoryId) {
      setError('Source and destination factory must be different.');
      return;
    }
    if (lines.some((l) => !l.sourceLotId || !l.quantity)) {
      setError('Every line needs a lot and quantity.');
      return;
    }

    const payload = {
      fromFactoryId: form.fromFactoryId,
      toFactoryId: form.toFactoryId,
      vehicleNumber: form.vehicleNumber || undefined,
      initiatedDate: form.initiatedDate,
      lines: lines.map((l) => ({ productId: l.productId, sourceLotId: l.sourceLotId, quantity: Number(l.quantity) })),
    };

    initiateMutation.mutateAsync(payload).then(() => { toast.success('Transfer initiated'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to initiate transfer.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Initiate Stock Transfer</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>From Factory</Label>
              <select value={form.fromFactoryId} onChange={(e) => setForm({ ...form, fromFactoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>To Factory</Label>
              <select value={form.toFactoryId} onChange={(e) => setForm({ ...form, toFactoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select</option>
                {(factoryData?.rows || []).filter((f) => f.id !== form.fromFactoryId).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle No.</Label>
              <Input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lots to Transfer</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={!form.fromFactoryId}><Plus size={14} /> Add Line</Button>
            </div>
            {lines.map((line, i) => {
              const lot = (lotData?.rows || []).find((l) => l.id === line.sourceLotId);
              return (
                <div key={i} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">
                  <select value={line.sourceLotId} onChange={(e) => updateLine(i, 'sourceLotId', e.target.value)} className="h-9 px-2 rounded-md border border-input bg-background text-sm" required>
                    <option value="" disabled>Select lot</option>
                    {(lotData?.rows || []).map((l) => (
                      <option key={l.id} value={l.id}>{l.lotNumber} — {l.product?.name} ({l.qtyAvailable} avail)</option>
                    ))}
                  </select>
                  <Input
                    type="number" step="0.01" min="0" max={lot?.qtyAvailable} placeholder="Qty"
                    value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} required
                  />
                  <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={initiateMutation.isPending}>{initiateMutation.isPending ? 'Sending...' : 'Initiate Transfer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDisposeFixedAsset } from '@/hooks/use-fixed-assets';
import { MoneyAccountSelect } from '@/components/ledger/money-account-select';
import { formatINR, toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

/** Sell or scrap an asset. Depreciation to the disposal date is charged by the server first. */
export function DisposeAssetDialog({ asset, onOpenChange }) {
  const [form, setForm] = useState({ disposedOn: today(), proceedsRupees: '', mode: 'BANK', accountId: undefined, note: '' });
  const [error, setError] = useState('');
  const dispose = useDisposeFixedAsset();

  useEffect(() => {
    if (asset) { setForm({ disposedOn: today(), proceedsRupees: '', mode: 'BANK', accountId: undefined, note: '' }); setError(''); }
  }, [asset]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const proceeds = toPaise(form.proceedsRupees);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await dispose.mutateAsync({
        id: asset.id,
        disposedOn: form.disposedOn,
        proceedsPaise: proceeds,
        ...(proceeds > 0 ? { payment: { mode: form.mode, ...(form.accountId ? { accountId: form.accountId } : {}) } } : {}),
        note: form.note || undefined,
      });
      const gain = result.gainPaise;
      toast.success(`${asset.assetNumber} disposed — ${gain >= 0 ? 'profit' : 'loss'} of ${formatINR(Math.abs(gain))}`);
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not dispose of the asset.');
    }
  };

  return (
    <Dialog open={!!asset} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dispose {asset?.assetNumber}</DialogTitle>
          <DialogDescription>
            {asset?.name} — book value {formatINR(asset?.bookValuePaise)} before depreciation to the disposal date. Leave the sale price at zero if it was scrapped.
          </DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disp-date">Disposed on</Label>
              <Input id="disp-date" type="date" value={form.disposedOn} onChange={(e) => set({ disposedOn: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disp-proceeds">Sold for (₹)</Label>
              <Input id="disp-proceeds" type="number" step="0.01" min="0" value={form.proceedsRupees} onChange={(e) => set({ proceedsRupees: e.target.value })} placeholder="0" />
            </div>
          </div>
          {proceeds > 0 && (
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="disp-mode">Received in</Label>
                <select id="disp-mode" className="h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.mode} onChange={(e) => set({ mode: e.target.value, accountId: undefined })}>
                  <option value="BANK">Bank</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <MoneyAccountSelect mode={form.mode} value={form.accountId} onChange={(v) => set({ accountId: v })} className="flex-1" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="disp-note">Note (optional)</Label>
            <Input id="disp-note" value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Sold to Sahu Transport" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={dispose.isPending}>{dispose.isPending ? 'Posting…' : 'Dispose asset'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

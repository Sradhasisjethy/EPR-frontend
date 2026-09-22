import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDepreciationPreview, useRunDepreciation } from '@/hooks/use-fixed-assets';
import { useFactories } from '@/hooks/use-factory';
import { formatINR } from '@/lib/money';
import { formatDate, today } from '@/lib/date-format';
import { toast } from 'sonner';

const SELECT = 'w-full h-9 px-3 rounded-md border border-input bg-background text-sm';

/** Last day of the month before `isoDate` — the usual date to run depreciation up to. */
const lastMonthEnd = (isoDate) => {
  const d = new Date(`${isoDate.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
};

/**
 * Shows exactly what will post, asset by asset, before anything does. The
 * figures come from the same server calculation the run uses.
 */
export function DepreciationRunDialog({ open, onOpenChange }) {
  const [factoryId, setFactoryId] = useState('');
  const [upTo, setUpTo] = useState(lastMonthEnd(today()));
  const [error, setError] = useState('');
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const factories = factoryData?.rows || [];
  const preview = useDepreciationPreview({ factoryId: open ? factoryId : '', upTo });
  const run = useRunDepreciation();

  useEffect(() => {
    if (open) { setUpTo(lastMonthEnd(today())); setError(''); }
  }, [open]);
  useEffect(() => {
    if (open && !factoryId && factories.length === 1) setFactoryId(factories[0].id);
  }, [open, factoryId, factories]);

  const lines = preview.data?.lines || [];

  const handlePost = async () => {
    setError('');
    try {
      const result = await run.mutateAsync({ factoryId, upTo });
      toast.success(`${result.runNumber}: ${formatINR(result.totalPaise)} depreciation posted`);
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post depreciation.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Run Depreciation</DialogTitle>
          <DialogDescription>Charges every active asset from where its last run stopped up to the date you choose.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dep-factory">Factory</Label>
            <select id="dep-factory" className={SELECT} value={factoryId} onChange={(e) => setFactoryId(e.target.value)}>
              <option value="">Select factory</option>
              {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-upto">Up to</Label>
            <Input id="dep-upto" type="date" value={upTo} onChange={(e) => setUpTo(e.target.value)} />
          </div>
        </div>

        {factoryId && (
          preview.isLoading ? (
            <div className="h-32 rounded-lg bg-muted/40 animate-pulse" />
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing to charge — every asset is already depreciated to {formatDate(upTo)} or fully written off.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Asset</th>
                    <th className="text-left px-3 py-2 font-medium">From</th>
                    <th className="text-right px-3 py-2 font-medium">Days</th>
                    <th className="text-right px-3 py-2 font-medium">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.assetId} className="border-t border-border/50">
                      <td className="px-3 py-1.5">{l.assetNumber} · {l.name} <span className="text-xs text-muted-foreground">({l.method})</span></td>
                      <td className="px-3 py-1.5">{formatDate(l.fromDate)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.days}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(l.amountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2" colSpan={3}>Total</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(preview.data.totalPaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePost} disabled={!lines.length || run.isPending}>
            {run.isPending ? 'Posting…' : lines.length ? `Post ${formatINR(preview.data.totalPaise)}` : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

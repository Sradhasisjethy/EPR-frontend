import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DenominationCounter, countTotalPaise, toDenominations } from './denomination-counter';
import { useOpenTill, useCloseTill } from '@/hooks/use-cash-register';
import { formatINR } from '@/lib/money';
import { toast } from 'sonner';

export function OpenTillDialog({ open, onOpenChange, factoryId }) {
  const [counts, setCounts] = useState({});
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const openTill = useOpenTill();

  useEffect(() => {
    if (open) { setCounts({}); setNote(''); setError(''); }
  }, [open]);

  const submit = async () => {
    setError('');
    try {
      const session = await openTill.mutateAsync({ factoryId, denominations: toDenominations(counts), note: note || undefined });
      toast.success(`${session.sessionNumber} opened with ${formatINR(session.openingCountedPaise)}`);
      if (session.openingVariancePaise !== 0) {
        toast.warning(`The drawer is ${formatINR(Math.abs(session.openingVariancePaise))} ${session.openingVariancePaise < 0 ? 'short of' : 'over'} what the books say.`);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open the till.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Open the till</DialogTitle>
          <DialogDescription>Count what is in the drawer before the first sale of the shift.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <DenominationCounter counts={counts} onChange={setCounts} label="Opening count" />
        <div className="space-y-1.5">
          <Label htmlFor="till-open-note">Note (optional)</Label>
          <Input id="till-open-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Morning shift, Ramesh" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={openTill.isPending}>{openTill.isPending ? 'Opening…' : 'Open till'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CloseTillDialog({ session, onOpenChange }) {
  const [counts, setCounts] = useState({});
  const [note, setNote] = useState('');
  const [adjust, setAdjust] = useState(false);
  const [error, setError] = useState('');
  const closeTill = useCloseTill();

  useEffect(() => {
    if (session) { setCounts({}); setNote(''); setAdjust(false); setError(''); }
  }, [session]);

  const counted = countTotalPaise(counts);
  const expected = session?.expectedNowPaise ?? 0;
  const variance = counted - expected;
  // Before anything is typed the "difference" is just the whole drawer, which
  // is not something to offer to write off. Entering a zero counts as counted.
  const countedAnything = Object.values(counts).some((v) => v !== '' && v !== undefined && v !== null);

  const submit = async () => {
    setError('');
    try {
      const closed = await closeTill.mutateAsync({ id: session.id, denominations: toDenominations(counts), note: note || undefined, postAdjustment: adjust });
      toast.success(
        closed.closingVariancePaise === 0
          ? `${closed.sessionNumber} closed and balanced`
          : `${closed.sessionNumber} closed — ${formatINR(Math.abs(closed.closingVariancePaise))} ${closed.closingVariancePaise < 0 ? 'short' : 'over'}`
      );
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not close the till.');
    }
  };

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Close {session?.sessionNumber}</DialogTitle>
          <DialogDescription>Count the drawer. The books say it should hold {formatINR(expected)}.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <DenominationCounter counts={counts} onChange={setCounts} label="Closing count" />

        <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>Expected</span><span className="tabular-nums">{formatINR(expected)}</span></div>
          <div className="flex justify-between"><span>Counted</span><span className="tabular-nums">{formatINR(counted)}</span></div>
          <div className={cn('flex justify-between font-semibold border-t border-border pt-1', variance !== 0 && (variance < 0 ? 'text-rose-600' : 'text-amber-600'))}>
            <span>{variance === 0 ? 'Balanced' : variance < 0 ? 'Short by' : 'Over by'}</span>
            <span className="tabular-nums">{formatINR(Math.abs(variance))}</span>
          </div>
        </div>

        {variance !== 0 && countedAnything && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={adjust} onChange={(e) => setAdjust(e.target.checked)} />
            <span>
              Write this difference off to Cash Short / Excess, so the cash account matches the drawer.
              <span className="block text-xs text-muted-foreground">Leave it unticked to record the difference and look into it first.</span>
            </span>
          </label>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="till-close-note">Note (optional)</Label>
          <Input id="till-close-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Handed over to evening shift" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={closeTill.isPending}>{closeTill.isPending ? 'Closing…' : 'Close till'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

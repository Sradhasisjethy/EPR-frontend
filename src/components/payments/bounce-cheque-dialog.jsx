import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toPaise } from '@/lib/money';
import { useBounceCheque } from '@/hooks/use-cheques';

/**
 * A bounce is not just a status change: it reverses the receipt/payment that
 * accepted the cheque and books the bank's charge. The dialog says so, because
 * the consequence is bigger than the button implies.
 */
export function BounceChequeDialog({ open, onOpenChange, cheque }) {
  const [reason, setReason] = useState('');
  const [chargesRupees, setChargesRupees] = useState('');
  const [error, setError] = useState('');
  const bounce = useBounceCheque();

  useEffect(() => {
    if (open) {
      setReason('');
      setChargesRupees('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    bounce
      .mutateAsync({
        id: cheque.id,
        reason,
        bankChargesPaise: chargesRupees ? toPaise(chargesRupees) : 0,
      })
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to record the bounce.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cheque {cheque?.chequeNumber} bounced</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            This reverses the {cheque?.direction === 'INBOUND' ? 'receipt' : 'payment'} that accepted this cheque —
            the party&apos;s balance goes back to what it was — and books any bank charge as an expense.
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Insufficient funds" required minLength={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Bank charges (₹, optional)</Label>
            <Input type="number" step="0.01" min="0" value={chargesRupees} onChange={(e) => setChargesRupees(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={bounce.isPending}>
              {bounce.isPending ? 'Recording...' : 'Record Bounce'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

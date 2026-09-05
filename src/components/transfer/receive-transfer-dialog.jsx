import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReceiveTransfer } from '@/hooks/use-transfer';
import { toInput } from '@/lib/decimal';

export function ReceiveTransferDialog({ open, onOpenChange, transfer }) {
  const [receivedDate, setReceivedDate] = useState('');
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const receiveMutation = useReceiveTransfer();

  useEffect(() => {
    if (open && transfer) {
      setReceivedDate(new Date().toISOString().slice(0, 10));
      setQuantities(Object.fromEntries(transfer.lines.map((l) => [l.id, toInput(l.quantity)])));
      setError('');
    }
  }, [open, transfer]);

  if (!transfer) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      id: transfer.id,
      receivedDate,
      lines: transfer.lines.map((l) => ({ lineId: l.id, receivedQuantity: Number(quantities[l.id]) })),
    };
    receiveMutation.mutateAsync(payload).then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to receive transfer.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Receive Transfer {transfer.transferNumber}</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <p className="text-xs text-muted-foreground -mt-2">If less than the sent quantity is entered, the shortfall is recorded as transit loss, not silently absorbed.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Received Date</Label>
            <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Lines</Label>
            {transfer.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr_120px] gap-2 items-center text-sm">
                <span>{line.product?.name} — sent {line.quantity}</span>
                <Input
                  type="number" step="0.01" min="0" max={line.quantity}
                  value={quantities[line.id] ?? ''}
                  onChange={(e) => setQuantities({ ...quantities, [line.id]: e.target.value })}
                  required
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={receiveMutation.isPending}>{receiveMutation.isPending ? 'Saving...' : 'Confirm Receipt'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

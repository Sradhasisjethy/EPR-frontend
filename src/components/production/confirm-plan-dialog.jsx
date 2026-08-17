import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirmPlan } from '@/hooks/use-production';

export function ConfirmPlanDialog({ open, onOpenChange, plan }) {
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const confirmMutation = useConfirmPlan();

  useEffect(() => {
    if (open && plan) {
      setQuantities(Object.fromEntries(plan.lines.map((l) => [l.id, String(l.confirmedQty ?? l.requiredQty)])));
      setError('');
    }
  }, [open, plan]);

  if (!plan) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const lines = plan.lines.map((l) => ({ lineId: l.id, confirmedQty: Number(quantities[l.id]) }));
    confirmMutation.mutateAsync({ id: plan.id, lines }).then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to confirm plan.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirm Production Plan</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {plan.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr_120px] gap-2 items-center text-sm">
                <span>{line.product?.name} — proposed {line.requiredQty}</span>
                <Input type="number" step="0.01" min="0" value={quantities[line.id] ?? ''} onChange={(e) => setQuantities({ ...quantities, [line.id]: e.target.value })} required />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={confirmMutation.isPending}>{confirmMutation.isPending ? 'Confirming...' : 'Confirm Plan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

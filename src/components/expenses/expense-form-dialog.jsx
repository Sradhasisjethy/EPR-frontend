import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateExpense } from '@/hooks/use-expenses';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

export function ExpenseFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', expenseDate: '', category: '', mode: 'CASH', amountRupees: '', paidToPartyId: '', description: '' });
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: partyData } = useParties({ page: 1, limit: 100 });
  const createMutation = useCreateExpense();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', expenseDate: today(), category: '', mode: 'CASH', amountRupees: '', paidToPartyId: '', description: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      factoryId: form.factoryId,
      expenseDate: form.expenseDate,
      category: form.category,
      mode: form.mode,
      amountPaise: toPaise(form.amountRupees),
      paidToPartyId: form.paidToPartyId || undefined,
      description: form.description || undefined,
    };
    createMutation.mutateAsync(payload).then(() => { toast.success('Expense recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to record expense.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Factory</Label>
            <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select factory</option>
              {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Diesel, Repairs" required />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" min="0" value={form.amountRupees} onChange={(e) => setForm({ ...form, amountRupees: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Paid To (optional)</Label>
            <select value={form.paidToPartyId} onChange={(e) => setForm({ ...form, paidToPartyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="">None</option>
              {(partyData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Record Expense'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

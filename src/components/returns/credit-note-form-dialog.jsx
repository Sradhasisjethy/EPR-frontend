import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCreditNote } from '@/hooks/use-returns';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';
import { toPaise } from '@/lib/money';

export function CreditNoteFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', customerPartyId: '', noteDate: '', reason: '', amountRupees: '' });
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: customerData } = useParties({ page: 1, limit: 100, partyType: PartyType.CUSTOMER });
  const createMutation = useCreateCreditNote();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', customerPartyId: '', noteDate: new Date().toISOString().slice(0, 10), reason: '', amountRupees: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = { factoryId: form.factoryId, customerPartyId: form.customerPartyId, noteDate: form.noteDate, reason: form.reason, amountPaise: toPaise(form.amountRupees) };
    createMutation.mutateAsync(payload).then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to create credit note.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Credit Note</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Factory</Label>
            <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select factory</option>
              {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <select value={form.customerPartyId} onChange={(e) => setForm({ ...form, customerPartyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select customer</option>
              {(customerData?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Note Date</Label>
              <Input type="date" value={form.noteDate} onChange={(e) => setForm({ ...form, noteDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" min="0" value={form.amountRupees} onChange={(e) => setForm({ ...form, amountRupees: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. agreed rate correction" required minLength={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create Credit Note'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

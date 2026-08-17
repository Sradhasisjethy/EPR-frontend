import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateAdvance } from '@/hooks/use-workforce';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';
import { toPaise } from '@/lib/money';

export function AdvanceFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', partyId: '', advanceDate: '', mode: 'BANK', amountRupees: '', reason: '' });
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: contractorData } = useParties({ page: 1, limit: 100, partyType: PartyType.CONTRACTOR });
  const { data: labourData } = useParties({ page: 1, limit: 100, partyType: PartyType.LABOUR });
  const partyOptions = [...(contractorData?.rows || []), ...(labourData?.rows || [])];
  const createMutation = useCreateAdvance();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', partyId: '', advanceDate: new Date().toISOString().slice(0, 10), mode: 'BANK', amountRupees: '', reason: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = { factoryId: form.factoryId, partyId: form.partyId, advanceDate: form.advanceDate, mode: form.mode, amountPaise: toPaise(form.amountRupees), reason: form.reason || undefined };
    createMutation.mutateAsync(payload).then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to record advance.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Advance</DialogTitle></DialogHeader>
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
            <Label>Contractor / Labourer</Label>
            <select value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select party</option>
              {partyOptions.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partyType})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.advanceDate} onChange={(e) => setForm({ ...form, advanceDate: e.target.value })} required />
            </div>
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
            <Label>Reason (optional)</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. festival advance" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Record Advance'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

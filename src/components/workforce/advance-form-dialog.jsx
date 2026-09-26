import { useEffect, useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateAdvance } from '@/hooks/use-workforce';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

export function AdvanceFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', partyId: '', advanceDate: '', mode: 'BANK', amountRupees: '', reason: '' });
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 }, { enabled: open });
  const createMutation = useCreateAdvance();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', partyId: '', advanceDate: today(), mode: 'BANK', amountRupees: '', reason: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = { factoryId: form.factoryId, partyId: form.partyId, advanceDate: form.advanceDate, mode: form.mode, amountPaise: toPaise(form.amountRupees), reason: form.reason || undefined };
    createMutation.mutateAsync(payload).then(() => { toast.success('Advance recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to record advance.'));
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
            <Label htmlFor="adv-party">Contractor / Labourer</Label>
            {/* Both kinds in one searchable list. It used to be the first 100
                contractors plus the first 100 labourers concatenated, so the
                121st contractor could not be paid an advance. */}
            <SearchableSelect
              id="adv-party"
              value={form.partyId}
              onChange={(id) => setForm({ ...form, partyId: id })}
              useOptions={useParties}
              filters={{ partyTypes: 'CONTRACTOR,LABOUR', status: 'active' }}
              getOptionLabel={(option) => option.name}
              getOptionHint={(option) => (option.partyType === 'CONTRACTOR' ? 'Contractor' : 'Labour')}
              placeholder="Select contractor or labourer"
              searchPlaceholder="Type a name or code…"
              emptyMessage="No contractor or labourer matches that."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

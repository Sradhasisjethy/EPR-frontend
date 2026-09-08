import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateContractorEntry } from '@/hooks/use-workforce';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useProducts } from '@/hooks/use-products';
import { PartyType, ProductType } from '@/constants/enums';
import { toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

export function ProductionEntryFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', contractorPartyId: '', productId: '', productionDate: '', quantity: '', pieceRateRupees: '' });
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: contractorData } = useParties({ page: 1, limit: 100, partyType: PartyType.CONTRACTOR });
  const { data: productData } = useProducts({ page: 1, limit: 100, productType: ProductType.FINISHED_GOOD });
  const createMutation = useCreateContractorEntry();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', contractorPartyId: '', productId: '', productionDate: today(), quantity: '', pieceRateRupees: '' });
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      factoryId: form.factoryId,
      contractorPartyId: form.contractorPartyId,
      productId: form.productId,
      productionDate: form.productionDate,
      quantity: Number(form.quantity),
      ...(form.pieceRateRupees ? { pieceRatePaiseOverride: toPaise(form.pieceRateRupees) } : {}),
    };

    createMutation.mutateAsync(payload).then(() => { toast.success('Contractor production recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to post contractor production entry.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Contractor Production Entry</DialogTitle></DialogHeader>
        {error && (
          <div className="p-3.5 bg-destructive/10 border border-destructive/25 text-destructive rounded-lg text-sm space-y-1.5 leading-relaxed">
            {error.split('\n').map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
                return (
                  <div key={idx} className="flex items-start gap-2 pl-2">
                    <span className="font-bold select-none">•</span>
                    <span>{trimmed.replace(/^[•-]\s*/, '')}</span>
                  </div>
                );
              }
              return (
                <p key={idx} className={idx > 0 && error.split('\n')[idx - 1]?.trim().startsWith('•') ? "pt-1 text-xs opacity-90" : "font-medium"}>
                  {trimmed}
                </p>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Factory</Label>
            <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select factory</option>
              {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Contractor</Label>
            <select value={form.contractorPartyId} onChange={(e) => setForm({ ...form, contractorPartyId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select contractor</option>
              {(contractorData?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Product (finished good)</Label>
            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
              <option value="" disabled>Select product</option>
              {(productData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" step="0.01" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Rate Override (₹, optional)</Label>
              <Input type="number" step="0.01" min="0" value={form.pieceRateRupees} onChange={(e) => setForm({ ...form, pieceRateRupees: e.target.value })} placeholder="From price list" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Consumes raw material from the contractor's "With Contractor" holding per the mix design, creates finished stock, and credits the contractor's account (BR-22).</p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Posting...' : 'Post Entry'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

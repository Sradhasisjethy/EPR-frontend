import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGenerateProposal } from '@/hooks/use-production';
import { useFactories } from '@/hooks/use-factory';

export function GeneratePlanDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', planDate: '' });
  const [error, setError] = useState('');
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const generateMutation = useGenerateProposal();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', planDate: new Date().toISOString().slice(0, 10) });
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    generateMutation.mutateAsync(form).then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to generate proposal.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Generate Production Proposal</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          BR-12: proposes required quantities from open sales orders minus current stock. Nothing is produced until you confirm the plan.
        </p>
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
            <Label>Plan Date</Label>
            <Input type="date" value={form.planDate} onChange={(e) => setForm({ ...form, planDate: e.target.value })} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={generateMutation.isPending}>{generateMutation.isPending ? 'Generating...' : 'Generate Proposal'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

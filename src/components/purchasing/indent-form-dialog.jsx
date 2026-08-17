import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateIndent } from '@/hooks/use-indents';
import { useFactories } from '@/hooks/use-factory';
import { useProducts } from '@/hooks/use-products';

const emptyLine = { productId: '', quantity: '' };

/**
 * FR-M11-1: an indent asks for a quantity. Price is deliberately absent — that
 * is decided by the buyer when the indent is converted into a purchase order.
 */
export function IndentFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', indentDate: '', requiredByDate: '', remarks: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: productData } = useProducts({ page: 1, limit: 100 });
  const createMutation = useCreateIndent();

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', indentDate: new Date().toISOString().slice(0, 10), requiredByDate: '', remarks: '' });
      setLines([{ ...emptyLine }]);
      setError('');
    }
  }, [open]);

  const updateLine = (i, field, value) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (lines.some((l) => !l.productId || !l.quantity)) {
      setError('Every line needs a product and a quantity.');
      return;
    }

    createMutation
      .mutateAsync({
        ...form,
        requiredByDate: form.requiredByDate || undefined,
        remarks: form.remarks || undefined,
        lines: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      })
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to raise the indent.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Raise Purchase Indent</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Factory</Label>
              <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Indent Date</Label>
              <Input type="date" value={form.indentDate} onChange={(e) => setForm({ ...form, indentDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Required By</Label>
              <Input type="date" value={form.requiredByDate} onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Why this is needed" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lines (quantity only — the rate is set when a PO is raised)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus size={14} /> Add Line</Button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                <select value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)} className="h-9 px-2 rounded-md border border-input bg-background text-sm" required>
                  <option value="" disabled>Product</option>
                  {(productData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Input type="number" step="0.01" min="0" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} required />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Raising...' : 'Raise Indent'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

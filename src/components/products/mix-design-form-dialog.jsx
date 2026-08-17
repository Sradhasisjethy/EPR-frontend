import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMixDesign, useUpdateMixDesign, useProducts, useUoms } from '@/hooks/use-products';
import { ProductType } from '@/constants/enums';

const emptyLine = { rawMaterialProductId: '', quantityPerUnit: '', uomId: '' };

export function MixDesignFormDialog({ open, onOpenChange, mixDesign, defaultProductId }) {
  const isEditing = !!mixDesign;
  const [form, setForm] = useState({ productId: '', name: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: productData } = useProducts({ page: 1, limit: 100 });
  const { data: uomData } = useUoms({ page: 1, limit: 100 });
  const finishedGoods = (productData?.rows || []).filter((p) => p.productType === ProductType.FINISHED_GOOD);
  const rawMaterials = (productData?.rows || []).filter((p) => p.productType === ProductType.RAW_MATERIAL);

  const createMutation = useCreateMixDesign();
  const updateMutation = useUpdateMixDesign();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (mixDesign) {
        setForm({ productId: mixDesign.productId || '', name: mixDesign.name || '' });
        setLines(
          (mixDesign.lines || []).map((l) => ({
            rawMaterialProductId: l.rawMaterialProductId,
            quantityPerUnit: String(l.quantityPerUnit),
            uomId: l.uomId,
          }))
        );
      } else {
        setForm({ productId: defaultProductId || '', name: '' });
        setLines([{ ...emptyLine }]);
      }
      setError('');
    }
  }, [open, mixDesign, defaultProductId]);

  const updateLine = (index, field, value) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!lines.length || lines.some((l) => !l.rawMaterialProductId || !l.quantityPerUnit || !l.uomId)) {
      setError('Every mix design line needs a raw material, quantity, and UoM.');
      return;
    }

    const payload = {
      productId: form.productId,
      name: form.name,
      lines: lines.map((l) => ({ ...l, quantityPerUnit: Number(l.quantityPerUnit) })),
    };

    const mutation = isEditing ? updateMutation.mutateAsync({ id: mixDesign.id, ...payload }) : createMutation.mutateAsync(payload);

    mutation.then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to save mix design.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Mix Design' : 'New Mix Design (BOM)'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}
        {!isEditing && (
          <p className="text-xs text-muted-foreground -mt-2">
            Saving this activates it automatically and deactivates any other mix design for the same product (BR-06).
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mix-product">Finished Good</Label>
              <select
                id="mix-product"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
                disabled={isEditing}
              >
                <option value="" disabled>Select product</option>
                {finishedGoods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mix-name">Design Name</Label>
              <Input id="mix-name" placeholder="Standard Mix v1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Raw Material Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus size={14} /> Add Line
              </Button>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px_100px_32px] gap-2 items-center">
                <select
                  value={line.rawMaterialProductId}
                  onChange={(e) => updateLine(index, 'rawMaterialProductId', e.target.value)}
                  className="h-9 px-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="" disabled>Raw material</option>
                  {rawMaterials.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="Qty / unit"
                  value={line.quantityPerUnit}
                  onChange={(e) => updateLine(index, 'quantityPerUnit', e.target.value)}
                  required
                />
                <select
                  value={line.uomId}
                  onChange={(e) => updateLine(index, 'uomId', e.target.value)}
                  className="h-9 px-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="" disabled>UoM</option>
                  {(uomData?.rows || []).map((u) => (
                    <option key={u.id} value={u.id}>{u.code}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Mix Design'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

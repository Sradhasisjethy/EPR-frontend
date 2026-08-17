import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProduct, useUpdateProduct, useUoms, useProductCategories, useHsnCodes } from '@/hooks/use-products';
import { toPaise, fromPaise } from '@/lib/money';
import { ProductType } from '@/constants/enums';

const emptyForm = {
  name: '',
  code: '',
  categoryId: '',
  uomId: '',
  hsnId: '',
  productType: ProductType.FINISHED_GOOD,
  curingDays: '0',
  standardCostRupees: '',
  status: 'active',
};

export function ProductFormDialog({ open, onOpenChange, product }) {
  const isEditing = !!product;
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { data: uomData } = useUoms({ page: 1, limit: 100 });
  const { data: categoryData } = useProductCategories({ page: 1, limit: 100 });
  const { data: hsnData } = useHsnCodes({ page: 1, limit: 100 });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name || '',
              code: product.code || '',
              categoryId: product.categoryId || '',
              uomId: product.uomId || '',
              hsnId: product.hsnId || '',
              productType: product.productType || ProductType.FINISHED_GOOD,
              curingDays: String(product.curingDays ?? 0),
              standardCostRupees: fromPaise(product.standardCostPaise),
              status: product.status || 'active',
            }
          : emptyForm
      );
      setError('');
    }
  }, [open, product]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      code: form.code,
      categoryId: form.categoryId || undefined,
      uomId: form.uomId,
      hsnId: form.hsnId || undefined,
      productType: form.productType,
      curingDays: Number(form.curingDays) || 0,
      standardCostPaise: toPaise(form.standardCostRupees),
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: product.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation.then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to save product.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'New Product'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Name</Label>
              <Input id="product-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-code">SKU / Code</Label>
              <Input id="product-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-type">Product Type</Label>
            <select
              id="product-type"
              value={form.productType}
              onChange={(e) => setForm({ ...form, productType: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value={ProductType.FINISHED_GOOD}>Finished Good</option>
              <option value={ProductType.RAW_MATERIAL}>Raw Material</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-category">Category</Label>
              <select
                id="product-category"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">None</option>
                {(categoryData?.rows || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-uom">UoM</Label>
              <select
                id="product-uom"
                value={form.uomId}
                onChange={(e) => setForm({ ...form, uomId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
              >
                <option value="" disabled>Select UoM</option>
                {(uomData?.rows || []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                ))}
              </select>
            </div>
          </div>

          {form.productType === ProductType.FINISHED_GOOD && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="product-hsn">HSN Code</Label>
                <select
                  id="product-hsn"
                  value={form.hsnId}
                  onChange={(e) => setForm({ ...form, hsnId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">None</option>
                  {(hsnData?.rows || []).map((h) => (
                    <option key={h.id} value={h.id}>{h.code} — {h.gstRatePercent}%</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-curing">Curing Days</Label>
                <Input
                  id="product-curing"
                  type="number"
                  min="0"
                  value={form.curingDays}
                  onChange={(e) => setForm({ ...form, curingDays: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="product-cost">Standard Cost (₹)</Label>
            <Input
              id="product-cost"
              type="number"
              step="0.01"
              min="0"
              value={form.standardCostRupees}
              onChange={(e) => setForm({ ...form, standardCostRupees: e.target.value })}
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="product-status">Status</Label>
              <select
                id="product-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

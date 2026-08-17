import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePriceList, useUpdatePriceList, usePriceList } from '@/hooks/use-pricing';
import { useProducts } from '@/hooks/use-products';
import { useParties } from '@/hooks/use-parties';
import { PriceType, PartyType } from '@/constants/enums';
import { toPaise, fromPaise } from '@/lib/money';

const emptyLine = { productId: '', rateRupees: '' };

export function PriceListFormDialog({ open, onOpenChange, priceListId }) {
  const isEditing = !!priceListId;
  const [form, setForm] = useState({ name: '', priceType: PriceType.RETAIL, partyId: '', isDefault: false });
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: existing } = usePriceList(priceListId);
  const { data: productData } = useProducts({ page: 1, limit: 100 });
  const { data: partyData } = useParties({ page: 1, limit: 100 });
  const createMutation = useCreatePriceList();
  const updateMutation = useUpdatePriceList();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (isEditing && existing) {
        setForm({ name: existing.name, priceType: existing.priceType, partyId: existing.partyId || '', isDefault: !!existing.isDefault });
        setItems((existing.items || []).map((i) => ({ productId: i.productId, rateRupees: fromPaise(i.ratePaise) })));
      } else if (!isEditing) {
        setForm({ name: '', priceType: PriceType.RETAIL, partyId: '', isDefault: false });
        setItems([{ ...emptyLine }]);
      }
      setError('');
    }
  }, [open, isEditing, existing]);

  const updateItem = (index, field, value) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  const addItem = () => setItems((prev) => [...prev, { ...emptyLine }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const needsParty = form.priceType === PriceType.PARTY_SPECIFIC || form.priceType === PriceType.CONTRACTOR_RATE;
  const partyOptions = (partyData?.rows || []).filter((p) =>
    form.priceType === PriceType.CONTRACTOR_RATE ? p.partyType === PartyType.CONTRACTOR : true
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (items.some((i) => !i.productId || i.rateRupees === '')) {
      setError('Every line needs a product and a rate.');
      return;
    }

    const payload = {
      name: form.name,
      priceType: form.priceType,
      partyId: needsParty ? form.partyId || undefined : undefined,
      isDefault: form.isDefault,
      items: items.map((i) => ({ productId: i.productId, ratePaise: toPaise(i.rateRupees) })),
    };

    const mutation = isEditing ? updateMutation.mutateAsync({ id: priceListId, ...payload }) : createMutation.mutateAsync(payload);
    mutation.then(() => onOpenChange(false)).catch((err) => setError(err.response?.data?.message || 'Failed to save price list.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Price List' : 'New Price List'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pl-name">Name</Label>
              <Input id="pl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-type">Type</Label>
              <select
                id="pl-type"
                value={form.priceType}
                onChange={(e) => setForm({ ...form, priceType: e.target.value, partyId: '' })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value={PriceType.RETAIL}>Retail</option>
                <option value={PriceType.WHOLESALE}>Wholesale</option>
                <option value={PriceType.PARTY_SPECIFIC}>Party-specific</option>
                <option value={PriceType.CONTRACTOR_RATE}>Contractor Rate</option>
              </select>
            </div>
          </div>

          {needsParty && (
            <div className="space-y-1.5">
              <Label htmlFor="pl-party">{form.priceType === PriceType.CONTRACTOR_RATE ? 'Contractor' : 'Party'}</Label>
              <select
                id="pl-party"
                value={form.partyId}
                onChange={(e) => setForm({ ...form, partyId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
              >
                <option value="" disabled>Select</option>
                {partyOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rates</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={14} /> Add Line
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
                <select
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                  className="h-9 px-2 rounded-md border border-input bg-background text-sm"
                  required
                >
                  <option value="" disabled>Product</option>
                  {(productData?.rows || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Input
                  type="number" step="0.01" min="0" placeholder="Rate (₹)"
                  value={item.rateRupees}
                  onChange={(e) => updateItem(index, 'rateRupees', e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Price List'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

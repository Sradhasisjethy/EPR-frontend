import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProducts } from '@/hooks/use-products';
import { ProductPicker } from '@/components/products/product-picker';
import { useCreateBundleRule, useUpdateBundleRule } from '@/hooks/use-bundles';
import { toInput } from '@/lib/decimal';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyComponent = { componentProductId: '', quantity: '1', scalingMode: 'PROPORTIONAL', uomId: '', uomLabel: '', isMandatory: false, defaultSelected: true };

/**
 * Defines what a product brings with it.
 *
 * Only a DRAFT can be edited — an ACTIVE rule is what open orders were quoted
 * from, so changing it in place would silently alter what customers agreed to.
 * The page offers "New version" for that instead.
 */
export function BundleRuleFormDialog({ open, onOpenChange, rule }) {
  const [form, setForm] = useState({ code: '', name: '', parentProductId: '', effectiveFrom: '', priority: '100' });
  const [components, setComponents] = useState([{ ...emptyComponent }]);
  const [error, setError] = useState('');
  // An escape hatch: if something has not been marked as an accessory yet, the
  // user should not have to abandon the form to fix it.
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Only for the count in the hint below — the pickers search server-side.
  const { data: accessoryData } = useProducts({ page: 1, limit: 1, isAccessory: 'true' });
  const createRule = useCreateBundleRule();
  const updateRule = useUpdateBundleRule();

  const isEditing = !!rule;
  const saving = createRule.isPending || updateRule.isPending;
  const accessoryCount = Number(accessoryData?.count ?? 0);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (rule) {
      setForm({
        code: rule.code || '',
        name: rule.name || '',
        parentProductId: rule.parentProductId || '',
        effectiveFrom: rule.effectiveFrom || '',
        priority: toInput(rule.priority, '100'),
      });
      setComponents(
        (rule.components || []).map((c) => ({
          componentProductId: c.componentProductId,
          quantity: toInput(c.quantity),
          scalingMode: c.scalingMode,
          uomId: c.uomId,
          uomLabel: c.uom?.code || c.uom?.name || '',
          isMandatory: !!c.isMandatory,
          defaultSelected: c.defaultSelected !== false,
        }))
      );
    } else {
      setForm({ code: '', name: '', parentProductId: '', effectiveFrom: today(), priority: '100' });
      setComponents([{ ...emptyComponent }]);
    }
  }, [open, rule]);

  const updateComponent = (i, field, value) =>
    setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  /**
   * Choosing an item fixes its unit too.
   *
   * A component's quantity goes straight onto the order line and nothing
   * converts it, so the unit has to be the one the product is actually
   * measured in — "2 MTR of a cable stocked in NOS" would put 2 of the wrong
   * thing on the order with no error anywhere. The server enforces this; the
   * form simply stops asking.
   */
  const selectComponentProduct = (i, productId, product) => {
    setComponents((prev) =>
      prev.map((c, idx) =>
        idx === i
          ? {
              ...c,
              componentProductId: productId,
              uomId: product?.uomId || '',
              // Kept on the row so the unit shows without another lookup — the
              // picker only ever loads a page of results, so the chosen item
              // may not be in any list this component holds.
              uomLabel: product?.uom?.code || product?.uom?.name || '',
            }
          : c
      )
    );
  };

  const submit = () => {
    setError('');
    if (!form.name || !form.parentProductId || !form.effectiveFrom || (!isEditing && !form.code)) {
      setError('A bundle needs a code, a name, the product it belongs to, and a start date.');
      return;
    }
    if (components.some((c) => !c.componentProductId || !c.quantity)) {
      setError('Every accessory needs an item and a quantity.');
      return;
    }

    const payload = {
      name: form.name,
      parentProductId: form.parentProductId,
      effectiveFrom: form.effectiveFrom,
      priority: Number(form.priority) || 100,
      components: components.map((c, i) => ({
        componentProductId: c.componentProductId,
        quantity: Number(c.quantity),
        scalingMode: c.scalingMode,
        uomId: c.uomId,
        isMandatory: c.isMandatory,
        defaultSelected: c.defaultSelected,
        sequence: i + 1,
      })),
    };

    const request = isEditing
      ? updateRule.mutateAsync({ id: rule.id, ...payload })
      : createRule.mutateAsync({ ...payload, code: form.code });

    request
      .then(() => { toast.success(isEditing ? 'Bundle updated' : 'Bundle created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Could not save this bundle.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit draft — ${rule.code}` : 'New bundle'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={form.code}
                disabled={isEditing}
                placeholder="RCC-PIPE-KIT"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              {isEditing && (
                <p className="text-[11px] text-muted-foreground">
                  The code identifies this bundle across every version, so it cannot change.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} placeholder="RCC pipe jointing kit" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Product this bundle belongs to</Label>
              <ProductPicker
                value={form.parentProductId}
                onChange={(id) => setForm({ ...form, parentProductId: id })}
                filters={{ status: 'active' }}
                placeholder="Search products…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>In force from</Label>
              <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Label>Accessories</Label>
                <p className="text-[11px] text-muted-foreground">
                  {showAllProducts
                    ? 'Showing every product.'
                    : `Searching the ${accessoryCount} product${accessoryCount === 1 ? '' : 's'} marked as an accessory.`}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setShowAllProducts((v) => !v)}
                  >
                    {showAllProducts ? 'Show accessories only' : 'Show all products'}
                  </button>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setComponents((p) => [...p, { ...emptyComponent }])}>
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>

            {!showAllProducts && accessoryCount === 0 && (
              <div className="p-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                Nothing is marked as an accessory yet. Open <span className="font-medium">Masters → Products</span>,
                edit the item, and tick <span className="font-medium">"This is an accessory"</span> — or show all
                products above to pick one now.
              </div>
            )}

            <div className="space-y-3">
              {components.map((c, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Item</Label>
                      <ProductPicker
                        value={c.componentProductId}
                        onChange={(id, product) => selectComponentProduct(i, id, product)}
                        filters={showAllProducts ? { status: 'active' } : { status: 'active', isAccessory: 'true' }}
                        placeholder={showAllProducts ? 'Search products…' : 'Search accessories…'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantity</Label>
                      <Input value={c.quantity} onChange={(e) => updateComponent(i, 'quantity', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit</Label>
                      <div className="h-9 flex items-center px-3 rounded-md border border-dashed border-border bg-muted/30 text-sm">
                        {c.uomLabel || <span className="text-muted-foreground">Pick an item first</span>}
                      </div>
                    </div>
                    <button
                      className="h-9 px-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setComponents((p) => p.filter((_, idx) => idx !== i))}
                      disabled={components.length === 1}
                      title="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={c.scalingMode === 'PROPORTIONAL'}
                        onChange={() => updateComponent(i, 'scalingMode', 'PROPORTIONAL')}
                      />
                      Per unit sold
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        checked={c.scalingMode === 'FIXED'}
                        onChange={() => updateComponent(i, 'scalingMode', 'FIXED')}
                      />
                      One per order
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={c.defaultSelected} onChange={(e) => updateComponent(i, 'defaultSelected', e.target.checked)} />
                      Added automatically
                    </label>
                    <label className="flex items-center gap-1.5" title="Removing it needs the mandatory-override permission">
                      <input type="checkbox" checked={c.isMandatory} onChange={(e) => updateComponent(i, 'isMandatory', e.target.checked)} />
                      Product does not work without it
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save draft' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

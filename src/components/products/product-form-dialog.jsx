import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProduct, useUpdateProduct, useUoms, useProductCategories, useHsnCodes } from '@/hooks/use-products';
import { toPaise, fromPaise } from '@/lib/money';
import { ProductType } from '@/constants/enums';
import { toInput } from '@/lib/decimal';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

// A function, not a constant: today() must be evaluated when the dialog
// opens, not once when the module is imported — otherwise a tab left open
// overnight offers yesterday.
const emptyForm = () => ({
  name: '',
  code: '',
  categoryId: '',
  uomId: '',
  hsnId: '',
  productType: ProductType.FINISHED_GOOD,
  curingDays: '0',
  qcRequired: false,
  isAccessory: false,
  standardCostRupees: '',
  sellingPriceRupees: '',
  openingStockQty: '',
  openingStockRateRupees: '',
  openingStockDate: today(),
  defaultLocation: '',
  reorderLevel: '',
  minStock: '',
  maxStock: '',
  status: 'active',
});

export function ProductFormDialog({ open, onOpenChange, product }) {
  const isEditing = !!product;
  const [form, setForm] = useState(emptyForm());
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
              curingDays: toInput(product.curingDays, '0'),
              qcRequired: !!product.qcRequired,
              isAccessory: !!product.isAccessory,
              standardCostRupees: fromPaise(product.standardCostPaise),
              sellingPriceRupees: fromPaise(product.sellingPricePaise),
              openingStockQty: toInput(product.openingStockQty),
              openingStockRateRupees: fromPaise(product.openingStockRatePaise),
              openingStockDate: product.openingStockDate ? product.openingStockDate.slice(0, 10) : today(),
              defaultLocation: product.defaultLocation || '',
              reorderLevel: product.reorderLevel != null ? String(product.reorderLevel) : '',
              minStock: product.minStock != null ? String(product.minStock) : '',
              maxStock: product.maxStock != null ? String(product.maxStock) : '',
              status: product.status || 'active',
            }
          : emptyForm()
      );
      setError('');
    }
  }, [open, product]);

  const hsnList = hsnData?.rows || [];
  const selectedHsn = hsnList.find((h) => h.id === form.hsnId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (form.minStock && form.maxStock && Number(form.maxStock) < Number(form.minStock)) {
      setError('Maximum stock cannot be lower than minimum stock.');
      return;
    }

    const payload = {
      name: form.name,
      code: form.code,
      categoryId: form.categoryId || undefined,
      uomId: form.uomId,
      hsnId: form.hsnId || undefined,
      productType: form.productType,
      curingDays: form.productType === ProductType.FINISHED_GOOD ? (Number(form.curingDays) || 0) : 0,
      qcRequired: form.productType === ProductType.FINISHED_GOOD ? form.qcRequired : false,
      isAccessory: form.isAccessory,
      standardCostPaise: toPaise(form.standardCostRupees),
      sellingPricePaise: toPaise(form.sellingPriceRupees),
      openingStockQty: form.openingStockQty !== '' ? Number(form.openingStockQty) : 0,
      openingStockRatePaise: toPaise(form.openingStockRateRupees),
      openingStockDate: form.openingStockDate || undefined,
      defaultLocation: form.defaultLocation || undefined,
      reorderLevel: form.reorderLevel !== '' ? Number(form.reorderLevel) : 0,
      minStock: form.minStock !== '' ? Number(form.minStock) : undefined,
      maxStock: form.maxStock !== '' ? Number(form.maxStock) : undefined,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: product.id, ...payload, status: form.status })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => { toast.success(isEditing ? 'Product updated' : 'Product created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to save product.'));
  };

  const isFinishedGood = form.productType === ProductType.FINISHED_GOOD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[calc(100vh-60px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-background">
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Product' : 'New Product'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0">
            {error}
          </div>
        )}

        <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* CARD 1: BASIC INFORMATION */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>📦</span> Identification & Hierarchy
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Reinforced Concrete Pipe 600mm"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="product-code">
                  SKU / Item Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. RCP-600-NP3"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="product-type">
                  Product Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="product-type"
                  value={form.productType}
                  onChange={(e) => setForm({ ...form, productType: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                >
                  <option value={ProductType.FINISHED_GOOD}>Finished Good (Manufactured/Saleable)</option>
                  <option value={ProductType.RAW_MATERIAL}>Raw Material (Consumed in Production)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="product-category">Category</Label>
                <select
                  id="product-category"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">None (Uncategorized)</option>
                  {(categoryData?.rows || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-uom">
                  Primary Unit of Measure (UoM) <span className="text-destructive">*</span>
                </Label>
                <select
                  id="product-uom"
                  value={form.uomId}
                  onChange={(e) => setForm({ ...form, uomId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                  required
                >
                  <option value="" disabled>Select UoM</option>
                  {(uomData?.rows || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code}) {u.uqc ? `— UQC: ${u.uqc}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CARD 2: TAXATION & GST LINKAGE (Available for both FG and RM) */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span>📑</span> GST & Statutory Taxation
              </h4>
              {selectedHsn && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    GST Rate: {selectedHsn.gstRatePercent}% (CGST {Number(selectedHsn.gstRatePercent) / 2}% + SGST {Number(selectedHsn.gstRatePercent) / 2}%)
                  </span>
                  {Number(selectedHsn.cessPercent) > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                      Cess: {selectedHsn.cessPercent}%
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground uppercase font-mono">
                    {selectedHsn.codeType || 'HSN'}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="product-hsn">HSN / SAC Code</Label>
                <select
                  id="product-hsn"
                  value={form.hsnId}
                  onChange={(e) => setForm({ ...form, hsnId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                >
                  <option value="">None / Exempt</option>
                  {hsnList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.code} — {h.gstRatePercent}% GST {h.description ? `(${h.description.slice(0, 30)}...)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <p className="text-xs text-muted-foreground">
                  {selectedHsn 
                    ? `Linked to GST Rate of ${selectedHsn.gstRatePercent}% for automated e-Invoicing, GSTR-1, and GST purchase billing.`
                    : 'Select an HSN code to automatically determine tax rates on sales orders, invoices, and purchase indents.'}
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3: PRICING & INVENTORY VALUATION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Pricing & Standard Cost */}
            <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                <span>💰</span> Pricing & Costing
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="product-selling-price" className="text-xs font-medium">
                    Base Selling Price / MRP (₹)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-semibold">₹</span>
                    <Input
                      id="product-selling-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.sellingPriceRupees}
                      onChange={(e) => setForm({ ...form, sellingPriceRupees: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs pl-6 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Default base price for fast sales order entry</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="product-cost" className="text-xs font-medium">
                    Standard Cost (₹)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-semibold">₹</span>
                    <Input
                      id="product-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.standardCostRupees}
                      onChange={(e) => setForm({ ...form, standardCostRupees: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs pl-6 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {isFinishedGood ? 'Standard BOM production cost' : 'Benchmark purchase unit rate'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Opening Stock & Storage Yard */}
            <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                <span>🏭</span> Opening Stock & Storage Location
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="product-opening-qty" className="text-xs font-medium">
                    Opening Stock Quantity
                  </Label>
                  <Input
                    id="product-opening-qty"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={form.openingStockQty}
                    onChange={(e) => setForm({ ...form, openingStockQty: e.target.value })}
                    placeholder="e.g. 100"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="product-opening-rate" className="text-xs font-medium">
                    Valuation Rate (₹/unit)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-semibold">₹</span>
                    <Input
                      id="product-opening-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.openingStockRateRupees}
                      onChange={(e) => setForm({ ...form, openingStockRateRupees: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs pl-6"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="product-opening-date" className="text-xs font-medium">As-Of Date</Label>
                  <Input
                    id="product-opening-date"
                    type="date"
                    value={form.openingStockDate}
                    onChange={(e) => setForm({ ...form, openingStockDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="product-default-loc" className="text-xs font-medium">Default Yard / Warehouse</Label>
                  <Input
                    id="product-default-loc"
                    value={form.defaultLocation}
                    onChange={(e) => setForm({ ...form, defaultLocation: e.target.value })}
                    placeholder="e.g. Main Plant Yard 1"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: REORDER LEVEL & STOCK CONTROLS */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>🔔</span> Stock Thresholds & Replenishment Alerts
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="product-reorder-level">Reorder Level (Qty)</Label>
                  <span className="text-[11px] text-primary font-semibold">Triggers Alert</span>
                </div>
                <Input
                  id="product-reorder-level"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                  placeholder="e.g. 50"
                />
                <p className="text-[10px] text-muted-foreground">Raises replenishment indent when balance dips below this.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-min-stock">Minimum Safety Stock</Label>
                <Input
                  id="product-min-stock"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  placeholder="e.g. 20"
                />
                <p className="text-[10px] text-muted-foreground">Absolute critical buffer threshold.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-max-stock">Maximum Stock Capacity</Label>
                <Input
                  id="product-max-stock"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.maxStock}
                  onChange={(e) => setForm({ ...form, maxStock: e.target.value })}
                  placeholder="e.g. 500"
                />
                <p className="text-[10px] text-muted-foreground">Avoids yard overcrowding and capital lockup.</p>
              </div>
            </div>
          </div>

          {/* CARD 5: CONTEXTUAL QUALITY & CURING CONTROLS (Only for Finished Goods) */}
          {isFinishedGood ? (
            <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                <span>🧪</span> Precast Curing & Quality Release Controls
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="product-curing">Curing Period (Days)</Label>
                    <span className="text-[11px] text-muted-foreground">Concrete Maturity Rule</span>
                  </div>
                  <Input
                    id="product-curing"
                    type="number"
                    min="0"
                    value={form.curingDays}
                    onChange={(e) => setForm({ ...form, curingDays: e.target.value })}
                    placeholder="e.g. 14 or 28"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Produced lots remain locked in CURING state until production date + curing days is achieved (BR-08).
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border/70 space-y-1.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      id="product-qc-required"
                      className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                      checked={form.qcRequired}
                      onChange={(e) => setForm({ ...form, qcRequired: e.target.checked })}
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold block text-foreground">
                        Requires Passing Quality Test Before Dispatch / Sale
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Mandates compressive strength / dimensional cube test sign-off in the Quality module before invoice generation.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-muted/20 border border-dashed border-border/60 text-xs text-muted-foreground flex items-center gap-2">
              <span>ℹ️</span> Curing Days and Mandatory QA release are disabled for Raw Materials & Consumables.
            </div>
          )}

          {/* Applies to any product type, so it sits outside the finished-good
              block above. It changes nothing about how the product behaves —
              only which list the bundle screen offers it in. */}
          <div className="p-3 rounded-lg bg-background border border-border/70">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                id="product-is-accessory"
                className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4"
                checked={form.isAccessory}
                onChange={(e) => setForm({ ...form, isAccessory: e.target.checked })}
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block text-foreground">
                  This is an accessory
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Something that normally goes out with another product — a rubber gasket with an RCC
                  pipe, an MS frame with a manhole cover, lifting hooks with a slab. It appears in the
                  accessory picker when you build a bundle, and can still be sold on its own.
                </span>
              </div>
            </label>
          </div>

          {isEditing && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="product-status">Product Status</Label>
              <select
                id="product-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="active">Active (Available for production & orders)</option>
                <option value="inactive">Inactive (Discontinued)</option>
              </select>
            </div>
          )}
        </form>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="product-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

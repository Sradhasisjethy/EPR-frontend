import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMixDesign, useUpdateMixDesign, useProducts, useUoms } from '@/hooks/use-products';
import { ProductType } from '@/constants/enums';
import { toPaise, fromPaise } from '@/lib/money';
import { toInput } from '@/lib/decimal';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyLine = { rawMaterialProductId: '', quantityPerUnit: '', wastagePercent: '0', uomId: '' };

export function MixDesignFormDialog({ open, onOpenChange, mixDesign, defaultProductId, onDelete }) {
  const isEditing = !!mixDesign;
  const [form, setForm] = useState({
    productId: '',
    name: '',
    outputQuantity: '1',
    effectiveFrom: today(),
    laborCostRupees: '',
    overheadCostRupees: '',
  });
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
        setForm({
          productId: mixDesign.productId || '',
          name: mixDesign.name || '',
          outputQuantity: toInput(mixDesign.outputQuantity, '1'),
          effectiveFrom: mixDesign.effectiveFrom ? mixDesign.effectiveFrom.slice(0, 10) : today(),
          laborCostRupees: fromPaise(mixDesign.laborCostPaise),
          overheadCostRupees: fromPaise(mixDesign.overheadCostPaise),
        });
        setLines(
          (mixDesign.lines || []).map((l) => ({
            rawMaterialProductId: l.rawMaterialProductId,
            quantityPerUnit: toInput(l.quantityPerUnit),
            wastagePercent: toInput(l.wastagePercent, '0'),
            uomId: l.uomId,
          }))
        );
      } else {
        setForm({
          productId: defaultProductId || '',
          name: '',
          outputQuantity: '1',
          effectiveFrom: today(),
          laborCostRupees: '',
          overheadCostRupees: '',
        });
        setLines([{ ...emptyLine }]);
      }
      setError('');
    }
  }, [open, mixDesign, defaultProductId]);

  const selectedProduct = finishedGoods.find((p) => p.id === form.productId);
  const productUomLabel = selectedProduct?.uom?.name || selectedProduct?.uom?.code || 'Unit';

  const updateLine = (index, field, value) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const handleRawMaterialSelect = (index, productId) => {
    const rm = rawMaterials.find((r) => r.id === productId);
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              rawMaterialProductId: productId,
              uomId: rm?.uomId || line.uomId,
            }
          : line
      )
    );
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
      outputQuantity: form.outputQuantity ? Number(form.outputQuantity) : 1,
      effectiveFrom: form.effectiveFrom || undefined,
      laborCostPaise: toPaise(form.laborCostRupees),
      overheadCostPaise: toPaise(form.overheadCostRupees),
      lines: lines.map((l) => ({
        rawMaterialProductId: l.rawMaterialProductId,
        quantityPerUnit: Number(l.quantityPerUnit),
        wastagePercent: l.wastagePercent !== '' ? Number(l.wastagePercent) : 0,
        uomId: l.uomId,
      })),
    };

    const mutation = isEditing ? updateMutation.mutateAsync({ id: mixDesign.id, ...payload }) : createMutation.mutateAsync(payload);

    mutation.then(() => { toast.success(isEditing ? 'Mix design updated' : 'Mix design created'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to save mix design.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-3 border-b border-border/60 shrink-0 bg-background">
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Mix Design (BOM)' : 'New Mix Design (Bill of Materials)'}
          </DialogTitle>
          {!isEditing && (
            <p className="text-xs text-muted-foreground mt-1">
              Saving this activates it automatically for production batching and deactivates earlier active versions for the same product (BR-06).
            </p>
          )}
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0">
            {error}
          </div>
        )}

        <form id="mix-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
          {/* HEADER PARAMETERS: PRODUCT, NAME, BATCH YIELD & EFFECTIVE DATE */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>🏗️</span> Mix Design Formulation & Output Yield
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mix-product">
                  Finished Good Product <span className="text-destructive">*</span>
                </Label>
                <select
                  id="mix-product"
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                  required
                  disabled={isEditing}
                >
                  <option value="" disabled>Select Finished Good</option>
                  {finishedGoods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mix-name">
                  Mix Design Name / Grade <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mix-name"
                  placeholder="e.g. M35 Precast Mix v2.1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mix-output-qty">
                    Base Output Batch Yield <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-medium">Batch Basis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="mix-output-qty"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={form.outputQuantity}
                    onChange={(e) => setForm({ ...form, outputQuantity: e.target.value })}
                    placeholder="1"
                    required
                  />
                  <span className="px-2.5 py-1.5 rounded-md border border-input bg-muted/40 text-xs font-semibold whitespace-nowrap">
                    {productUomLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mix-effective-from">
                    Effective From Date <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-medium">Historical Versioning</span>
                </div>
                <Input
                  id="mix-effective-from"
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <p className="text-[11px] text-muted-foreground pb-1">
                  Production entries match the active mix design effective on the exact casting date, allowing seamless mix adjustments without altering past lots.
                </p>
              </div>
            </div>
          </div>

          {/* BOM INGREDIENTS TABLE WITH WASTAGE % */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span>🧪</span> Raw Material Batching Components
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Input quantities required to produce {form.outputQuantity || 1} {productUomLabel}.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 gap-1.5">
                <Plus size={14} /> Add Raw Material
              </Button>
            </div>

            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[1.5fr_110px_100px_110px_36px] gap-2.5 px-1 text-xs font-semibold text-muted-foreground">
                <span>Raw Material Item</span>
                <span>Base Quantity</span>
                <span>Wastage (%)</span>
                <span>Unit (UoM)</span>
                <span></span>
              </div>

              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1.5fr_110px_100px_110px_36px] gap-2.5 items-center">
                  <select
                    value={line.rawMaterialProductId}
                    onChange={(e) => handleRawMaterialSelect(index, e.target.value)}
                    className="h-9 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                    required
                  >
                    <option value="" disabled>Select raw material</option>
                    {rawMaterials.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>

                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="Qty"
                    value={line.quantityPerUnit}
                    onChange={(e) => updateLine(index, 'quantityPerUnit', e.target.value)}
                    required
                    className="h-9 text-xs"
                  />

                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={line.wastagePercent}
                      onChange={(e) => updateLine(index, 'wastagePercent', e.target.value)}
                      className="h-9 text-xs pr-6"
                    />
                    <span className="absolute right-2 top-2 text-[11px] text-muted-foreground font-semibold">%</span>
                  </div>

                  <select
                    value={line.uomId}
                    onChange={(e) => updateLine(index, 'uomId', e.target.value)}
                    className="h-9 px-2 rounded-md border border-input bg-background text-xs font-medium"
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
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-20 transition-colors flex items-center justify-center"
                    title="Remove line"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Wastage % accounts for handling, slump loss, batch hopper clinging, and transit residue. Standard consumption will explode base quantity + wastage allowance.
            </p>
          </div>

          {/* OVERHEAD & CONVERSION COSTS (OPTIONAL WIP / LABOR & MACHINERY) */}
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>⚙️</span> Operational Overhead & Direct Conversion Costs (Per Batch)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="mix-labor-cost" className="text-xs font-medium">Direct Labor / Gang Wage Cost (₹)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-semibold">₹</span>
                  <Input
                    id="mix-labor-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.laborCostRupees}
                    onChange={(e) => setForm({ ...form, laborCostRupees: e.target.value })}
                    placeholder="0.00"
                    className="h-8 text-xs pl-6 font-medium"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Estimated manpower / casting gang cost per batch output.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="mix-overhead-cost" className="text-xs font-medium">Machinery & Plant Overhead Cost (₹)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-semibold">₹</span>
                  <Input
                    id="mix-overhead-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.overheadCostRupees}
                    onChange={(e) => setForm({ ...form, overheadCostRupees: e.target.value })}
                    placeholder="0.00"
                    className="h-8 text-xs pl-6 font-medium"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Electricity, batching plant run-time, diesel, and maintenance per batch.</p>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-between">
          <div>
            {isEditing && mixDesign?.status === 'DRAFT' && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onDelete(mixDesign);
                }}
              >
                <Trash2 size={14} className="mr-1.5" /> Delete Draft
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="mix-form" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Mix Design'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

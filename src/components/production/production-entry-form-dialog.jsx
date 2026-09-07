import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProductionEntry } from '@/hooks/use-production';
import { useFactories } from '@/hooks/use-factory';
import { useProducts, useResolvedMixDesign, useExplodeMixDesign } from '@/hooks/use-products';
import { ProductType } from '@/constants/enums';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

export function ProductionEntryFormDialog({ open, onOpenChange, defaultFactoryId, defaultProductId, defaultPlanLineId }) {
  const [form, setForm] = useState({ factoryId: '', productId: '', productionDate: '', goodQty: '', rejectedQty: '0' });
  const [materialOverrides, setMaterialOverrides] = useState({}); // { rawMaterialProductId: { actualQty, varianceReason } }
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: productData } = useProducts({ page: 1, limit: 100, productType: ProductType.FINISHED_GOOD });
  // Resolved by production date, matching what the server will actually
  // consume. Selecting the `isActive` version instead meant a backdated entry
  // showed one recipe and posted another.
  const mixDesignQuery = useResolvedMixDesign(form.productId, form.productionDate);
  const activeMixDesign = mixDesignQuery.data;
  // The server works out what a run actually consumes: wastage applied, and
  // each BOM unit converted into the one the material is stocked in. Doing that
  // arithmetic here as well is how the screen came to promise "11400 KG" while
  // the recipe really meant 7.75 CUM.
  const explodeQuery = useExplodeMixDesign(
    activeMixDesign?.id,
    Number(form.goodQty) > 0 ? Number(form.goodQty) : 0
  );
  const createMutation = useCreateProductionEntry();

  useEffect(() => {
    if (open) {
      setForm({
        factoryId: defaultFactoryId || '',
        productId: defaultProductId || '',
        productionDate: today(),
        goodQty: '',
        rejectedQty: '0',
      });
      setMaterialOverrides({});
      setError('');
    }
  }, [open, defaultFactoryId, defaultProductId]);

  // Changing the product or the production date can resolve a different recipe.
  // Overrides are keyed by material, so without this a quantity typed against
  // one version would silently carry into another that happens to share it.
  const resolvedMixDesignId = activeMixDesign?.id;
  useEffect(() => {
    setMaterialOverrides({});
  }, [resolvedMixDesignId]);

  const requirementFor = (line) =>
    (explodeQuery.data?.requirements || []).find((r) => r.rawMaterialProductId === line.rawMaterialProductId);

  const expectedQty = (line) => Number(requirementFor(line)?.quantity ?? 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!activeMixDesign) {
      setError(
        mixDesignQuery.isError
          ? `No mix design is effective for this product on ${form.productionDate}. Activate one from that date, or change the production date.`
          : 'This product has no active mix design — configure one under Products & BOM.'
      );
      return;
    }

    const materialLines = activeMixDesign.lines.map((line) => {
      const override = materialOverrides[line.rawMaterialProductId];
      const actualQty = override?.actualQty !== undefined && override.actualQty !== '' ? Number(override.actualQty) : expectedQty(line);
      return { rawMaterialProductId: line.rawMaterialProductId, actualQty, varianceReason: override?.varianceReason || undefined };
    });

    const payload = {
      factoryId: form.factoryId,
      productId: form.productId,
      productionDate: form.productionDate,
      goodQty: Number(form.goodQty),
      rejectedQty: Number(form.rejectedQty) || 0,
      productionPlanLineId: defaultPlanLineId || undefined,
      materialLines,
    };

    createMutation.mutateAsync(payload).then(() => { toast.success('Production recorded'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to post production entry.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New Production Entry (Casting)</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}
        <p className="text-xs text-muted-foreground -mt-2">Creates a CURING lot and consumes raw material per the active mix design in one step (BR-06).</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Factory</Label>
              <select value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select factory</option>
                {(factoryData?.rows || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Product</Label>
              <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required disabled={!!defaultProductId}>
                <option value="" disabled>Select product</option>
                {(productData?.rows || []).map((p) => <option key={p.id} value={p.id}>{p.name} (curing {p.curingDays}d)</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Production Date</Label>
              <Input type="date" value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Good Qty</Label>
              <Input type="number" step="0.01" min="0" value={form.goodQty} onChange={(e) => setForm({ ...form, goodQty: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Rejected Qty</Label>
              <Input type="number" step="0.01" min="0" value={form.rejectedQty} onChange={(e) => setForm({ ...form, rejectedQty: e.target.value })} />
            </div>
          </div>

          {form.productId && form.productionDate && mixDesignQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading the mix design in force on {form.productionDate}…</p>
          )}

          {form.productId && form.productionDate && !mixDesignQuery.isLoading && !activeMixDesign && (
            <p className="text-sm text-destructive">
              No mix design is effective for this product on {form.productionDate}.
            </p>
          )}

          {activeMixDesign && (
            <div className="space-y-2">
              <Label>Raw Material Consumption (per the mix design in force on {form.productionDate} — edit if actuals differ)</Label>

              {/* If the server cannot work out the requirement — usually a
                  recipe unit with no conversion to the stocking unit — say so.
                  Otherwise every row silently reads "expected 0.00" and the
                  operator has no idea the figures are missing rather than zero. */}
              {explodeQuery.isError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs">
                  {explodeQuery.error?.response?.data?.message
                    || 'The expected quantities could not be worked out for this recipe.'}
                </div>
              )}

              {activeMixDesign.lines.map((line) => {
                const expected = expectedQty(line);
                const override = materialOverrides[line.rawMaterialProductId] || {};
                const actual = override.actualQty !== undefined && override.actualQty !== '' ? Number(override.actualQty) : expected;
                const hasVariance = form.goodQty && actual !== expected;
                return (
                  <div key={line.id} className="p-2 rounded-md border border-border space-y-1">
                    <div className="grid grid-cols-[1fr_100px_100px] gap-2 items-center text-sm">
                      {/* A blank name here means the mix design was resolved
                          without its materials — an operator being asked to
                          confirm a quantity of something unnamed. */}
                      <span>{line.rawMaterial?.name || <span className="text-destructive">Unnamed material</span>}</span>
                      <span className="text-muted-foreground text-xs">
                        {/* The unit the server converted INTO, not the one the
                            recipe was written in — otherwise 7.75 CUM gets
                            labelled "KG". */}
                        expected {expected.toFixed(2)} {requirementFor(line)?.uomCode || ''}
                      </span>
                      <Input
                        type="number" step="0.0001" min="0" placeholder="Actual"
                        value={override.actualQty ?? ''}
                        onChange={(e) => setMaterialOverrides({ ...materialOverrides, [line.rawMaterialProductId]: { ...override, actualQty: e.target.value } })}
                      />
                    </div>
                    {hasVariance && (
                      <Input
                        placeholder="Variance reason (required)"
                        value={override.varianceReason || ''}
                        onChange={(e) => setMaterialOverrides({ ...materialOverrides, [line.rawMaterialProductId]: { ...override, varianceReason: e.target.value } })}
                        required
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !activeMixDesign}>{createMutation.isPending ? 'Posting...' : 'Post Production Entry'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUoms } from '@/hooks/use-products';
import { useCreateUomConversion, useUpdateUomConversion } from '@/hooks/use-uom-conversions';
import { toast } from 'sonner';

export function UomConversionDialog({ open, onOpenChange, conversion }) {
  const isEdit = !!conversion;
  const [form, setForm] = useState({ fromUomId: '', toUomId: '', factor: '' });
  const [error, setError] = useState('');

  const { data: uomData } = useUoms({ page: 1, limit: 100 }, { enabled: open });
  const createMutation = useCreateUomConversion();
  const updateMutation = useUpdateUomConversion();

  useEffect(() => {
    if (open) {
      setForm(
        conversion
          ? { fromUomId: conversion.fromUomId, toUomId: conversion.toUomId, factor: String(conversion.factor) }
          : { fromUomId: '', toUomId: '', factor: '' }
      );
      setError('');
    }
  }, [open, conversion]);

  const uoms = uomData?.rows || [];
  const fromUom = uoms.find((u) => u.id === form.fromUomId);
  const toUom = uoms.find((u) => u.id === form.toUomId);

  const fromLabel = fromUom ? `${fromUom.name} (${fromUom.code})` : 'From Unit';
  const toLabel = toUom ? `${toUom.name} (${toUom.code})` : 'To Unit';

  const numFactor = Number(form.factor);
  const inverseFactor = numFactor > 0 ? (1 / numFactor).toFixed(6).replace(/\.?0+$/, '') : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.fromUomId === form.toUomId) {
      setError('A unit cannot be converted to itself.');
      return;
    }
    if (!form.factor || Number(form.factor) <= 0) {
      setError('Conversion factor must be greater than zero.');
      return;
    }
    const payload = { fromUomId: form.fromUomId, toUomId: form.toUomId, factor: Number(form.factor) };
    const mutation = isEdit ? updateMutation : createMutation;
    mutation
      .mutateAsync(isEdit ? { id: conversion.id, ...payload } : payload)
      .then(() => { toast.success(isEdit ? 'Conversion updated' : 'Conversion added'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to save the conversion.'));
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit UoM Conversion' : 'New UoM Unit Conversion'}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Source Unit (1 unit of)</Label>
              <select
                value={form.fromUomId}
                onChange={(e) => setForm({ ...form, fromUomId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                required
              >
                <option value="" disabled>Select unit</option>
                {uoms.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
            <span className="pb-2 text-muted-foreground font-bold text-lg">=</span>
            <div className="space-y-1.5">
              <Label>Target Unit</Label>
              <select
                value={form.toUomId}
                onChange={(e) => setForm({ ...form, toUomId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                required
              >
                <option value="" disabled>Select unit</option>
                {uoms.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="conv-factor">Conversion Factor Multiplier</Label>
              <span className="text-[11px] text-muted-foreground font-mono">1 [From] = X [To]</span>
            </div>
            <Input
              id="conv-factor"
              type="number"
              step="0.00000001"
              min="0.00000001"
              placeholder="e.g. 50 (for 1 Bag = 50 Kg) or 1400 (for 1 CUM = 1400 Kg)"
              value={form.factor}
              onChange={(e) => setForm({ ...form, factor: e.target.value })}
              required
            />
          </div>

          {/* DYNAMIC FORMULA PREVIEW BOX TO PREVENT INVERSION MISTAKES */}
          <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span>📐</span> Dynamic Formula Preview
              </span>
              <span className="text-[10px] text-muted-foreground">Auto-checked</span>
            </div>

            <div className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-center text-center">
              <span className="text-sm font-medium">
                1 <strong className="text-foreground">{fromUom?.name || 'Unit'}</strong> ={' '}
                <span className="text-primary font-extrabold text-base mx-1 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {form.factor ? form.factor : '—'}
                </span>{' '}
                <strong className="text-foreground">{toUom?.name || 'Units'}</strong>
              </span>
            </div>

            {inverseFactor && fromUom && toUom && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Derived Reverse Equivalent:</span>
                <span className="font-mono font-medium">
                  1 {toUom.code} = {inverseFactor} {fromUom.code}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Conversion'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

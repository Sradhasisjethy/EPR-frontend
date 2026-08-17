import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUoms } from '@/hooks/use-products';
import { useCreateUomConversion, useUpdateUomConversion } from '@/hooks/use-uom-conversions';

export function UomConversionDialog({ open, onOpenChange, conversion }) {
  const isEdit = !!conversion;
  const [form, setForm] = useState({ fromUomId: '', toUomId: '', factor: '' });
  const [error, setError] = useState('');

  const { data: uomData } = useUoms({ page: 1, limit: 100 });
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
  const fromCode = uoms.find((u) => u.id === form.fromUomId)?.code;
  const toCode = uoms.find((u) => u.id === form.toUomId)?.code;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.fromUomId === form.toUomId) {
      setError('A unit cannot be converted to itself.');
      return;
    }
    const payload = { fromUomId: form.fromUomId, toUomId: form.toUomId, factor: Number(form.factor) };
    const mutation = isEdit ? updateMutation : createMutation;
    mutation
      .mutateAsync(isEdit ? { id: conversion.id, ...payload } : payload)
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to save the conversion.'));
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit' : 'New'} UoM Conversion</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>From (1 unit of)</Label>
              <select value={form.fromUomId} onChange={(e) => setForm({ ...form, fromUomId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select unit</option>
                {uoms.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
              </select>
            </div>
            <span className="pb-2 text-muted-foreground">=</span>
            <div className="space-y-1.5">
              <Label>To</Label>
              <select value={form.toUomId} onChange={(e) => setForm({ ...form, toUomId: e.target.value })} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select unit</option>
                {uoms.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Factor</Label>
            <Input
              type="number" step="0.00000001" min="0.00000001"
              value={form.factor}
              onChange={(e) => setForm({ ...form, factor: e.target.value })}
              required
            />
            {fromCode && toCode && form.factor && (
              <p className="text-xs text-muted-foreground">
                1 {fromCode} = {form.factor} {toCode} &middot; the reverse ({toCode} &rarr; {fromCode}) is derived
                automatically, so don&apos;t define it separately.
              </p>
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

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionError } from '@/components/query-state';
import { useCreateInspection } from '@/hooks/use-quality';
import { useFactories } from '@/hooks/use-factory';
import { useStockLots } from '@/hooks/use-inventory';

const TYPES = [
  { value: 'FINAL', label: 'Final — releases the lot for sale' },
  { value: 'IN_PROCESS', label: 'In-process — a check during the run' },
  { value: 'INCOMING', label: 'Incoming — supplier material' },
];

const emptyForm = {
  factoryId: '', lotId: '', inspectionType: 'FINAL', inspectionDate: '',
  testAgeDays: '', sampleRef: '', requiredValue: '', unitLabel: 'N/mm2',
};

/**
 * Raises a test. `lot` pre-fills the dialog when it is opened from a held lot,
 * which is the common path — the lab works from the hold list, not from a
 * blank form.
 */
export function InspectionFormDialog({ open, onOpenChange, lot, defaultFactoryId }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: lotData } = useStockLots({
    page: 1, limit: 100,
    factoryId: form.factoryId || undefined,
    status: 'QC_HOLD',
  });

  const createInspection = useCreateInspection();

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      factoryId: lot?.factoryId || defaultFactoryId || '',
      lotId: lot?.id || '',
      inspectionDate: new Date().toISOString().slice(0, 10),
    });
    setError('');
  }, [open, lot, defaultFactoryId]);

  const lots = lotData?.rows || [];
  const selectedLot = lot || lots.find((l) => l.id === form.lotId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedLot) {
      setError('Select the lot being tested.');
      return;
    }

    createInspection.mutate(
      {
        factoryId: form.factoryId,
        productId: selectedLot.productId,
        lotId: selectedLot.id,
        inspectionType: form.inspectionType,
        inspectionDate: form.inspectionDate,
        testAgeDays: form.testAgeDays === '' ? undefined : Number(form.testAgeDays),
        sampleRef: form.sampleRef || undefined,
        requiredValue: form.requiredValue === '' ? undefined : Number(form.requiredValue),
        unitLabel: form.unitLabel || undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setError(err.response?.data?.message || 'Could not raise the inspection.'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Raise an inspection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground -mt-2">
            The result can be recorded now or later — a cube crushed in three weeks stays pending
            until someone enters the reading.
          </p>

          <ActionError message={error} onDismiss={() => setError('')} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qc-factory">Location</Label>
              <select
                id="qc-factory"
                value={form.factoryId}
                onChange={(e) => setForm({ ...form, factoryId: e.target.value, lotId: '' })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
                disabled={Boolean(lot)}
              >
                <option value="" disabled>Select location</option>
                {(factoryData?.rows || []).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qc-date">Inspection date</Label>
              <Input
                id="qc-date"
                type="date"
                value={form.inspectionDate}
                onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qc-lot">Lot</Label>
            {lot ? (
              <p className="text-sm px-3 h-9 flex items-center rounded-md border border-input bg-muted/40">
                {lot.lotNumber} — {lot.product?.name}
              </p>
            ) : (
              <select
                id="qc-lot"
                value={form.lotId}
                onChange={(e) => setForm({ ...form, lotId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                required
              >
                <option value="" disabled>Select a lot awaiting clearance</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lotNumber} — {l.product?.name} ({l.qtyAvailable})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qc-type">Inspection type</Label>
            <select
              id="qc-type"
              value={form.inspectionType}
              onChange={(e) => setForm({ ...form, inspectionType: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {form.inspectionType !== 'FINAL' && (
              <p className="text-xs text-muted-foreground">
                Only a final inspection releases or quarantines the lot. This one is recorded as information.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qc-age">Test age (days)</Label>
              <Input
                id="qc-age"
                type="number"
                min="0"
                value={form.testAgeDays}
                onChange={(e) => setForm({ ...form, testAgeDays: e.target.value })}
                placeholder="7"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-required">Required value</Label>
              <Input
                id="qc-required"
                type="number"
                step="0.01"
                value={form.requiredValue}
                onChange={(e) => setForm({ ...form, requiredValue: e.target.value })}
                placeholder="25"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-unit">Unit</Label>
              <Input
                id="qc-unit"
                value={form.unitLabel}
                onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qc-sample">Sample reference</Label>
            <Input
              id="qc-sample"
              value={form.sampleRef}
              onChange={(e) => setForm({ ...form, sampleRef: e.target.value })}
              placeholder="Cube ID or sample tag"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInspection.isPending}>
              {createInspection.isPending ? 'Saving…' : 'Raise inspection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

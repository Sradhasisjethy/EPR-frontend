import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionError } from '@/components/query-state';
import { useRecordInspectionResult } from '@/hooks/use-quality';

/**
 * Records the verdict on a pending test.
 *
 * The consequence is stated on the dialog rather than left implicit, because it
 * is not reversible from here: a pass releases the lot for sale, a fail
 * quarantines it. A verdict cannot be overwritten later — the API refuses it —
 * so the moment of clicking is the moment that matters.
 */
export function RecordResultDialog({ open, onOpenChange, inspection }) {
  const [form, setForm] = useState({ result: '', testedValue: '', remarks: '' });
  const [error, setError] = useState('');
  const recordResult = useRecordInspectionResult();

  useEffect(() => {
    if (open) {
      setForm({ result: '', testedValue: '', remarks: '' });
      setError('');
    }
  }, [open]);

  if (!inspection) return null;

  const required = inspection.requiredValue !== null && inspection.requiredValue !== undefined
    ? Number(inspection.requiredValue)
    : null;
  const tested = form.testedValue === '' ? null : Number(form.testedValue);

  // A hint, not a decision — the inspector chooses the verdict. Showing the
  // comparison stops the common slip of recording a pass on a failing number.
  const suggestion = required !== null && tested !== null
    ? (tested >= required ? 'PASS' : 'FAIL')
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.result) {
      setError('Choose a verdict — pass or fail.');
      return;
    }

    recordResult.mutate(
      {
        id: inspection.id,
        result: form.result,
        testedValue: form.testedValue === '' ? undefined : Number(form.testedValue),
        remarks: form.remarks || undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setError(err.response?.data?.message || 'Could not record the result.'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record result — {inspection.inspectionNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground -mt-2">
            {inspection.product?.name}
            {inspection.lot?.lotNumber ? ` · lot ${inspection.lot.lotNumber}` : ''}
            {inspection.testAgeDays !== null && inspection.testAgeDays !== undefined
              ? ` · ${inspection.testAgeDays}-day test`
              : ''}
          </p>

          <ActionError message={error} onDismiss={() => setError('')} />

          <div className="space-y-1.5">
            <Label htmlFor="tested-value">
              Measured value{inspection.unitLabel ? ` (${inspection.unitLabel})` : ''}
            </Label>
            <Input
              id="tested-value"
              type="number"
              step="0.01"
              value={form.testedValue}
              onChange={(e) => setForm({ ...form, testedValue: e.target.value })}
              placeholder={required !== null ? `Required: ${required}` : 'Measured result'}
            />
            {required !== null && (
              <p className="text-xs text-muted-foreground">
                Specification requires {required}
                {inspection.unitLabel ? ` ${inspection.unitLabel}` : ''}.
                {suggestion && (
                  <span className={suggestion === 'PASS' ? ' text-emerald-600' : ' text-destructive'}>
                    {' '}This reading is a {suggestion.toLowerCase()}.
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Verdict</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, result: 'PASS' })}
                className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                  form.result === 'PASS'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                    : 'border-input hover:bg-muted'
                }`}
              >
                Pass — release for sale
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, result: 'FAIL' })}
                className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                  form.result === 'FAIL'
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-input hover:bg-muted'
                }`}
              >
                Fail — quarantine
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qc-remarks">Remarks</Label>
            <Input
              id="qc-remarks"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Anything the next person should know"
            />
          </div>

          {form.result && (
            <p className="text-xs text-muted-foreground">
              {form.result === 'PASS'
                ? 'The lot becomes available to sell as soon as you save. This cannot be undone from here.'
                : 'The lot is quarantined and cannot be sold. The stock is not written off — record wastage separately if it is scrapped.'}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordResult.isPending}>
              {recordResult.isPending ? 'Saving…' : 'Save result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

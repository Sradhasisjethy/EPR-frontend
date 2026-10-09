import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Sparkles } from 'lucide-react';
import { useCreateFinancialYear, useUpdateFinancialYear } from '@/hooks/use-factory';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { WebPermissions } from '@/constants/enums';
import { needsCloseGrant } from '@/lib/financial-year-rules';

const computeEndDate = (start) => {
  if (!start) return '';
  const [y, m, d] = start.split('-').map(Number);
  if (!y || !m || !d) return '';
  const end = new Date(Date.UTC(y + 1, m - 1, d - 1));
  return end.toISOString().slice(0, 10);
};

const suggestCode = (start) => {
  if (!start) return '';
  const [y, m] = start.split('-').map(Number);
  if (!y) return '';
  if (m === 4) {
    const nextShort = String((y + 1) % 100).padStart(2, '0');
    return `${y}-${nextShort}`;
  }
  return String(y);
};

const emptyForm = { code: '', startDate: '', endDate: '', status: 'PLANNED' };

export function FinancialYearFormDialog({ open, onOpenChange, financialYear, otherYearIsCurrent = false }) {
  const isEditing = !!financialYear;
  // Lifecycle moves the API reserves for FINANCIAL_YEAR_CLOSE are shown but
  // disabled for everyone else, so the choice is visible and the reason is too.
  const { hasPermission } = usePermissions();
  const canCloseYears = hasPermission(WebPermissions.FINANCIAL_YEAR_CLOSE);
  const savedStatus = financialYear ? financialYear.status || (financialYear.isCurrent ? 'ACTIVE' : 'PLANNED') : null;
  const locked = (to) =>
    !canCloseYears && needsCloseGrant(savedStatus, to, otherYearIsCurrent, financialYear ? !!financialYear.isCurrent : false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const createMutation = useCreateFinancialYear();
  const updateMutation = useUpdateFinancialYear();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (financialYear) {
        setForm({
          code: financialYear.code || '',
          startDate: financialYear.startDate || '',
          endDate: financialYear.endDate || '',
          status: financialYear.status || (financialYear.isCurrent ? 'ACTIVE' : 'PLANNED'),
        });
      } else {
        // Default to April 1 of next/current cycle
        const now = new Date();
        const startY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const defaultStart = `${startY}-04-01`;
        setForm({
          code: suggestCode(defaultStart),
          startDate: defaultStart,
          endDate: computeEndDate(defaultStart),
          status: 'PLANNED',
        });
      }
      setError('');
    }
  }, [open, financialYear]);

  const handleStartDateChange = (startDate) => {
    const computedEnd = computeEndDate(startDate);
    const suggested = suggestCode(startDate);
    setForm((prev) => ({
      ...prev,
      startDate,
      endDate: computedEnd,
      // Auto-suggest code if code is empty or matches previous auto-suggestion pattern
      code: (!prev.code || prev.code.includes('-')) ? suggested : prev.code,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.startDate) {
      setError('Start date is required.');
      return;
    }

    const payload = {
      ...form,
      endDate: computeEndDate(form.startDate),
      isCurrent: form.status === 'ACTIVE',
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: financialYear.id, ...payload })
      : createMutation.mutateAsync(payload);

    mutation
      .then(() => { toast.success(isEditing ? 'Financial year updated' : 'Financial year created'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to save financial year.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Financial Year' : 'New Financial Year'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fy-start">
                Start Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                id="fy-start"
                type="date"
                value={form.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="fy-end">End Date</Label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Lock size={10} className="text-primary" /> 12 Months
                </span>
              </div>
              <Input
                id="fy-end"
                type="date"
                value={form.endDate}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed opacity-90 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="fy-code">
                FY Code / Display Name <span className="text-destructive font-bold">*</span>
              </Label>
              <span className="text-[10px] text-primary flex items-center gap-1 font-medium">
                <Sparkles size={11} /> Auto-suggested
              </span>
            </div>
            <Input
              id="fy-code"
              placeholder="e.g. 2027-28"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fy-status">Lifecycle State</Label>
            <select
              id="fy-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
            >
              <option value="PLANNED" disabled={locked('PLANNED')}>🟣 Draft / Planned (Configuring sequence & periods)</option>
              <option value="ACTIVE" disabled={locked('ACTIVE')}>🟢 Open / Active (Accepting general ledger postings)</option>
              {isEditing && (
                <>
                  <option value="SOFT_CLOSED" disabled={locked('SOFT_CLOSED')}>🟡 Closing in Progress (Operational AP/AR frozen)</option>
                  <option value="CLOSED" disabled={locked('CLOSED')}>🔒 Closed / Audited (Permanent read-only lock)</option>
                </>
              )}
            </select>
            {!canCloseYears && (
              <p className="text-xs text-muted-foreground">
                Closing, reopening or rolling over a year needs the financial-year close permission.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Financial Year'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  useFinancialYearCloseChecklist,
  useUpdateFinancialYearStatus,
} from '@/hooks/use-factory';

export function FinancialYearCloseWizardDialog({ open, onOpenChange, financialYear }) {
  const [targetStatus, setTargetStatus] = useState('SOFT_CLOSED');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const { data: checklistData, isLoading: checklistLoading } =
    useFinancialYearCloseChecklist(open ? financialYear?.id : null);
  const statusMutation = useUpdateFinancialYearStatus();

  const checks = checklistData?.checks || [];
  const currentStatus = financialYear?.status || (financialYear?.isCurrent ? 'ACTIVE' : 'PLANNED');

  const handleExecute = async () => {
    setError('');
    try {
      await statusMutation.mutateAsync({
        id: financialYear.id,
        status: targetStatus,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update financial year state.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <ShieldAlert size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Year-End Close Wizard ({financialYear?.code || 'FY'})
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Audit Controls & Financial Year Lifecycle Transition
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          {/* Section 1: Pre-Close Verification Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" /> 1. Pre-Close System Health Checks
              </h4>
              <span className="text-[11px] text-muted-foreground font-mono">
                {financialYear?.startDate} → {financialYear?.endDate}
              </span>
            </div>

            {checklistLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-card animate-pulse border border-border" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {checks.map((chk) => (
                  <div
                    key={chk.key}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                      chk.severity === 'WARNING'
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200'
                        : chk.severity === 'SUCCESS'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                        : 'bg-muted/40 border-border text-foreground'
                    }`}
                  >
                    <div className="mt-0.5">
                      {chk.severity === 'WARNING' ? (
                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                      ) : chk.severity === 'SUCCESS' ? (
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Info size={15} className="text-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{chk.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{chk.message}</div>
                    </div>
                    {chk.count !== undefined && (
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-background/80 border">
                        {chk.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Choose Target Lifecycle State */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Select Target Lifecycle State
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option: Soft Close */}
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  targetStatus === 'SOFT_CLOSED'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:bg-muted/30'
                }`}
              >
                <input
                  type="radio"
                  name="targetStatus"
                  value="SOFT_CLOSED"
                  checked={targetStatus === 'SOFT_CLOSED'}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">
                      🟡 Closing in Progress (Soft Closed)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Freezes operational dispatches and order creations. Leaves General Ledger open exclusively for finance adjustments and tax reconciliations.
                  </p>
                </div>
              </label>

              {/* Option: Permanent Hard Close */}
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  targetStatus === 'CLOSED'
                    ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/30'
                    : 'border-border hover:bg-muted/30'
                }`}
              >
                <input
                  type="radio"
                  name="targetStatus"
                  value="CLOSED"
                  checked={targetStatus === 'CLOSED'}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="mt-1 text-destructive focus:ring-destructive"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">
                      🔒 Final Closed / Audited (Permanent Read-Only Lock)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Completely seals all transactions, entries, and document series for this fiscal year. This action is final for statutory compliance.
                  </p>
                </div>
              </label>

              {/* Option: Reopen to Active if already Soft Closed */}
              {currentStatus === 'SOFT_CLOSED' && (
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    targetStatus === 'ACTIVE'
                      ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="targetStatus"
                    value="ACTIVE"
                    checked={targetStatus === 'ACTIVE'}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="mt-1 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-xs text-foreground">
                      🟢 Reopen to Active (Resume Normal Postings)
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Reactivates general postings and invoicing for this financial year.
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
            <input
              type="checkbox"
              id="confirm-close"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="confirm-close" className="text-xs text-muted-foreground cursor-pointer">
              I confirm that I have reviewed the pre-close checklist and have administrative authority to transition financial year <strong>{financialYear?.code}</strong>.
            </label>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!confirmed || statusMutation.isPending}
            onClick={handleExecute}
            variant={targetStatus === 'CLOSED' ? 'destructive' : 'default'}
          >
            {statusMutation.isPending ? 'Executing...' : 'Apply Lifecycle Transition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Lock, AlertCircle, Clock } from 'lucide-react';
import { useFinancialYearPeriods } from '@/hooks/use-factory';

export function FinancialYearPeriodsDialog({ open, onOpenChange, financialYearId, financialYearCode }) {
  const { data, isLoading } = useFinancialYearPeriods(open ? financialYearId : null);
  const periods = data?.periods || [];
  const fy = data?.financialYear;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active / Open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <CheckCircle2 size={12} /> Open
          </span>
        );
      case 'Adjustments Only':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
            <Clock size={12} /> Adjustments Only
          </span>
        );
      case 'Closed & Locked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold border border-border">
            <Lock size={12} /> Locked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20">
            <Clock size={12} /> Planned
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Calendar size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Monthly Accounting Periods ({financialYearCode || fy?.code || 'FY'})
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  12-Month Calendar Schedule & Posting Status
                </p>
              </div>
            </div>
            {fy && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border">
                {fy.startDate} to {fy.endDate}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-card animate-pulse border border-border" />
              ))}
            </div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No periods generated for this financial year.
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden divide-y divide-border">
              <div className="grid grid-cols-12 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-2">Period</div>
                <div className="col-span-4">Month</div>
                <div className="col-span-3">Date Range</div>
                <div className="col-span-3 text-right">Posting Status</div>
              </div>

              {periods.map((p) => (
                <div key={p.periodNumber} className="grid grid-cols-12 px-3 py-2.5 items-center text-xs hover:bg-muted/20 transition-colors">
                  <div className="col-span-2 font-mono font-bold text-primary">
                    {p.periodCode}
                  </div>
                  <div className="col-span-4 font-medium text-foreground">
                    {p.monthName}
                  </div>
                  <div className="col-span-3 text-muted-foreground text-[11px] font-mono">
                    {p.startDate.slice(5)} to {p.endDate.slice(5)}
                  </div>
                  <div className="col-span-3 text-right">
                    {getStatusBadge(p.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

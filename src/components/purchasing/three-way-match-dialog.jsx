import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/money';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { useThreeWayMatch } from '@/hooks/use-indents';

/**
 * FR-M11-6: PO <-> GRN <-> Invoice.
 *
 * Variances are shown, not blocked — a small price or quantity difference is
 * normal and needs a human decision, but it must be visible before the invoice
 * gets paid.
 */
export function ThreeWayMatchDialog({ open, onOpenChange, invoice }) {
  const { data, isLoading, isError } = useThreeWayMatch(open ? invoice?.id : null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Three-way match — {invoice?.vendorInvoiceNumber}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="h-48 rounded-lg border border-border bg-card animate-pulse" />
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to run the match.</p>
        ) : !data ? null : (
          <div className="space-y-4">
            <div className={cn(
              'flex items-start gap-2 p-3 rounded-lg border text-sm',
              data.matched
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
            )}>
              {data.matched ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
              <div>
                <p className="font-medium">{data.matched ? 'Matched' : `${data.variances.length} variance(s) found`}</p>
                {!data.matched && (
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    {data.variances.map((v, i) => <li key={i}>{v.message}</li>)}
                  </ul>
                )}
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-1.5">Product</th>
                  <th className="text-right">Ordered</th>
                  <th className="text-right">Accepted</th>
                  <th className="text-right">Variance</th>
                  {showRates && <th className="text-right">PO Rate</th>}
                  {showRates && <th className="text-right">GRN Rate</th>}
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.productId} className="border-b border-border/50">
                    <td className="py-1.5">{line.productName}</td>
                    <td className="text-right tabular-nums">{line.orderedQty ?? '—'}</td>
                    <td className="text-right tabular-nums">{line.acceptedQty}</td>
                    <td className={cn('text-right tabular-nums', line.quantityVariance ? 'text-destructive' : '')}>
                      {line.quantityVariance ?? '—'}
                    </td>
                    {showRates && <td className="text-right tabular-nums">{line.poRatePaise === null ? '—' : formatINR(line.poRatePaise)}</td>}
                    {showRates && (
                      <td className={cn('text-right tabular-nums', line.rateVariancePaise ? 'text-destructive' : '')}>
                        {formatINR(line.grnRatePaise)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {showRates && (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Figure label="Goods accepted" value={formatINR(data.receiptValuePaise)} />
                <Figure label="Vendor billed" value={formatINR(data.invoiceValuePaise)} />
                <Figure
                  label="Difference"
                  value={formatINR(data.valueVariancePaise)}
                  tone={data.valueVariancePaise === 0 ? 'good' : 'bad'}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Figure({ label, value, tone }) {
  return (
    <div className="p-3 rounded-lg border border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        'font-medium tabular-nums',
        tone === 'bad' && 'text-destructive',
        tone === 'good' && 'text-emerald-600 dark:text-emerald-400'
      )}>
        {value}
      </p>
    </div>
  );
}

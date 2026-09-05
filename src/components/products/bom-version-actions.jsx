import { useState } from 'react';
import { CheckCircle2, Copy, IndianRupee, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/money';
import { useActivateMixDesign, useCloneMixDesign, useMixDesignCost } from '@/hooks/use-products';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  SUPERSEDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export function BomStatusBadge({ status, version }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status] || STATUS_STYLES.DRAFT)}>
      v{version} · {status || 'DRAFT'}
    </span>
  );
}

/** Cost rollup for one BOM version (FR-M03-10). */
export function BomCostDialog({ open, onOpenChange, mixDesign }) {
  const { data, isLoading, error } = useMixDesignCost(open ? mixDesign?.id : null);
  const errorMessage = error?.response?.data?.message || error?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Material cost — {mixDesign?.name}</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="h-40 rounded-lg border border-border bg-card animate-pulse" />
        ) : error ? (
          <div className="space-y-3 py-2">
            <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-medium">
              {errorMessage || 'Failed to calculate material cost.'}
            </div>
            {errorMessage?.includes('No conversion is defined') && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                The recipe uses a unit that differs from the raw material&apos;s stocking unit. To resolve this, define a conversion factor between these units under <strong>Masters &gt; Products &amp; BOM &gt; UoM Conversions</strong> (e.g. 1 CUM = 1500 KG), or edit the mix design lines to match the stocking unit.
              </p>
            )}
          </div>
        ) : !data || !data.lines || data.lines.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No material lines found in this mix design.
          </div>
        ) : (
          <div className="space-y-3">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-1.5">Material</th>
                  <th className="text-right">Qty / unit</th>
                  <th className="text-right">Unit cost</th>
                  <th className="text-right">Line cost</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.rawMaterialProductId} className="border-b border-border/50">
                    <td className="py-1.5">
                      {line.rawMaterialName}
                      {line.wastagePercent > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">(+{line.wastagePercent}% wastage)</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{line.quantity}</td>
                    <td className="text-right tabular-nums">{formatINR(line.unitCostPaise)}</td>
                    <td className="text-right tabular-nums">{formatINR(line.lineCostPaise)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td className="py-2" colSpan={3}>Total material cost per output unit</td>
                  <td className="text-right tabular-nums">{formatINR(data.totalCostPaise)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs text-muted-foreground">
              Valued at each material&apos;s current standard cost, including the wastage allowance on every line.
              {data.totalCostPaise === 0 && (
                <span className="block text-amber-600 dark:text-amber-400 mt-1">
                  Note: Total cost is ₹0.00 because standard costs have not been set on the raw materials yet. You can configure them in the Products master.
                </span>
              )}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Activation asks for the effective date, because that is what decides which version a production entry resolves to. */
export function ActivateBomDialog({ open, onOpenChange, mixDesign }) {
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const activate = useActivateMixDesign();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    activate
      .mutateAsync({ id: mixDesign.id, effectiveFrom })
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to activate this version.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Activate {mixDesign?.name}</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
            <p className="text-xs text-muted-foreground">
              Production entries dated on or after this take this recipe; earlier entries keep resolving to the
              version that was in force on their own date, so history stays explainable.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
            The currently active version will be marked <strong>superseded</strong>. It is never deleted.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={activate.isPending}>{activate.isPending ? 'Activating...' : 'Activate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Row actions for a BOM version. */
export function BomRowActions({ mixDesign, onShowCost, onActivate, onDelete }) {
  const clone = useCloneMixDesign();

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => onShowCost(mixDesign)}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Material cost"
      >
        <IndianRupee size={16} />
      </button>
      <button
        onClick={() => clone.mutate({ id: mixDesign.id })}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Clone as a new draft"
      >
        <Copy size={16} />
      </button>
      {mixDesign.status === 'DRAFT' && onActivate && (
        <button
          onClick={() => onActivate(mixDesign)}
          className="p-1.5 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
          title="Activate this version"
        >
          <CheckCircle2 size={16} />
        </button>
      )}
      {mixDesign.status === 'DRAFT' && onDelete && (
        <button
          onClick={() => onDelete(mixDesign)}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete draft"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

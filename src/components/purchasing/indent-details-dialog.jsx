import { Eye, Check, X, FileText, Calendar, Building2, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { formatUom } from '@/lib/utils';

export function IndentDetailsDialog({
  open,
  onOpenChange,
  indent,
  canApprove,
  canCreate,
  onApprove,
  onReject,
  onConvertToPo,
}) {
  if (!indent) return null;

  const lines = indent.lines || [];

  // Group quantities by UoM
  const qtyByUom = lines.reduce((acc, l) => {
    const qty = Number(l.quantity) || 0;
    if (qty <= 0) return acc;
    const uom = l.product?.uom?.code || l.product?.uomCode || 'units';
    acc[uom] = (acc[uom] || 0) + qty;
    return acc;
  }, {});
  const uomEntries = Object.entries(qtyByUom);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[calc(100vh-60px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-background">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">
                    Purchase Indent #{indent.indentNumber}
                  </DialogTitle>
                  <StatusBadge status={indent.status.toLowerCase().replace(/_/g, ' ')} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Internal requisition review and line-item details
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* REJECTION REASON BANNER (IF REJECTED) */}
          {indent.status === 'REJECTED' && indent.rejectionReason && (
            <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider block">Rejection Reason:</span>
              <p className="text-sm">{indent.rejectionReason}</p>
            </div>
          )}

          {/* INDENT INFORMATION CARD */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>📋</span> Indent Header Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block font-medium">Factory / Plant</span>
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <Building2 size={14} className="text-muted-foreground" />
                  {indent.factory?.name || 'Main Plant'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block font-medium">Indent Date</span>
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  <Calendar size={14} className="text-muted-foreground" />
                  {indent.indentDate}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground block font-medium">Required By</span>
                <span className="text-sm font-semibold">
                  {indent.requiredByDate ? (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-muted-foreground" />
                      {indent.requiredByDate}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-normal">Not specified</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <span className="text-xs text-muted-foreground block font-medium mb-1">Remarks / Purpose</span>
              <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                {indent.remarks || <span className="text-muted-foreground italic">No remarks provided.</span>}
              </p>
            </div>
          </div>

          {/* REQUISITION LINE ITEMS */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <span>📦</span> Requisition Line Items ({lines.length})
              </h4>
              <p className="text-xs text-muted-foreground">
                Products and quantities requested by the factory.
              </p>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card/40 shadow-sm">
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  {/* Table Column Headers */}
                  <div className="grid grid-cols-[44px_1fr_100px_140px] gap-3 px-4 py-2.5 bg-muted/60 border-b border-border text-xs font-semibold text-muted-foreground items-center">
                    <div className="text-center">#</div>
                    <div>Product / Material</div>
                    <div className="text-center">UoM</div>
                    <div className="text-right">Required Qty</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border/60">
                    {lines.map((line, idx) => {
                      const qty = Number(line.quantity) || 0;
                      const rawUom = line.product?.uom?.code || line.product?.uomCode || '—';
                      const uomFormatted = formatUom(rawUom, qty);

                      return (
                        <div key={line.id || idx} className="p-2.5 px-4 hover:bg-muted/20 transition-colors">
                          <div className="grid grid-cols-[44px_1fr_100px_140px] gap-3 items-center">
                            <div className="text-center text-xs font-mono font-medium text-muted-foreground">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-sm font-semibold">{line.product?.name || 'Unnamed Product'}</div>
                              {line.product?.code && (
                                <div className="text-xs font-mono text-muted-foreground">[{line.product.code}]</div>
                              )}
                              {line.remarks && (
                                <div className="text-xs text-muted-foreground italic mt-0.5">{line.remarks}</div>
                              )}
                            </div>
                            <div className="text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono bg-muted/60 text-foreground border border-border/60">
                                {rawUom}
                              </span>
                            </div>
                            <div className="text-right font-mono text-sm font-bold text-foreground">
                              {qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                              <span className="ml-1 text-xs font-sans text-muted-foreground font-normal">
                                {uomFormatted}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 shadow-sm items-center">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Total Requisition Lines</span>
              <span className="text-sm font-bold tabular-nums">
                {lines.length} {lines.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] font-medium text-muted-foreground block">
                {uomEntries.length <= 1 ? 'Total Requisition Quantity' : 'Requisition Quantity by UoM'}
              </span>
              {uomEntries.length === 0 ? (
                <span className="text-sm font-bold tabular-nums text-muted-foreground">—</span>
              ) : uomEntries.length === 1 ? (
                <span className="text-sm font-bold tabular-nums text-primary font-mono">
                  {uomEntries[0][1].toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  <span className="ml-1 text-xs font-sans text-foreground/80 font-normal">
                    {formatUom(uomEntries[0][0], uomEntries[0][1])}
                  </span>
                </span>
              ) : (
                <div className="flex flex-wrap items-center sm:justify-end gap-1.5 pt-1">
                  {uomEntries.map(([uom, qty]) => (
                    <span
                      key={uom}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-xs font-semibold border border-primary/20"
                    >
                      {qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      <span className="ml-1 text-[11px] font-sans text-foreground/80 font-normal">
                        {formatUom(uom, qty)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {indent.status === 'PENDING_APPROVAL' && canApprove && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onOpenChange(false);
                    onReject?.(indent);
                  }}
                  className="gap-1.5"
                >
                  <X size={14} /> Reject Indent
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onApprove?.(indent.id);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                >
                  <Check size={14} /> Approve Indent
                </Button>
              </>
            )}

            {indent.status === 'APPROVED' && canCreate && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onConvertToPo?.(indent);
                }}
                className="gap-1.5 font-semibold"
              >
                <ShoppingCart size={14} /> Convert to PO
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

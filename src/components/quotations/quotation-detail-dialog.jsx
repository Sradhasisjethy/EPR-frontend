import { useState } from 'react';
import { ArrowRight, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateText } from '@/components/date-text';
import { useQuotation, useSetQuotationStatus, useConvertQuotation } from '@/hooks/use-quotations';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { today } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_STYLE = {
  DRAFT: 'bg-slate-500/10 text-slate-600',
  SENT: 'bg-blue-500/10 text-blue-600',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-600',
  REJECTED: 'bg-rose-500/10 text-rose-600',
  CONVERTED: 'bg-primary/10 text-primary',
  CANCELLED: 'bg-slate-500/10 text-slate-500',
};

export function QuotationStatusPill({ status, expired }) {
  const label = expired && ['DRAFT', 'SENT', 'ACCEPTED'].includes(status) ? 'Expired' : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', expired ? 'bg-amber-500/10 text-amber-600' : STATUS_STYLE[status])}>
      {label}
    </span>
  );
}

export function QuotationDetailDialog({ id, onOpenChange, onEdit }) {
  const { data: q, isLoading } = useQuotation(id);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canModify = hasPermission(user, WebPermissions.QUOTATION_MODIFY);
  const setStatus = useSetQuotationStatus();
  const convert = useConvertQuotation();

  const [reason, setReason] = useState('');
  const [askReject, setAskReject] = useState(false);
  const [orderDate, setOrderDate] = useState(today());
  const [error, setError] = useState('');

  const act = async (status, withReason) => {
    setError('');
    try {
      await setStatus.mutateAsync({ id, status, reason: withReason });
      toast.success(`Marked ${status.toLowerCase()}`);
      setAskReject(false);
      setReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the quotation.');
    }
  };

  const doConvert = async () => {
    setError('');
    try {
      const result = await convert.mutateAsync({ id, orderDate });
      toast.success(`Sales order ${result.order.orderNumber} raised${result.creditWarning ? ' (credit limit warning)' : ''}`);
      if (result.creditWarning) toast.warning(result.creditWarning);
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not convert the quotation.');
    }
  };

  const open = !!id;
  const live = q && ['DRAFT', 'SENT', 'ACCEPTED'].includes(q.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {q ? q.quotationNumber : 'Quotation'}
            {q && <QuotationStatusPill status={q.status} expired={q.isExpired} />}
          </DialogTitle>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        {isLoading || !q ? (
          <div className="h-56 rounded-lg bg-muted/40 animate-pulse" />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-muted-foreground">
              <span className="text-foreground font-medium">{q.buyerName}</span>
              <span>Dated <DateText value={q.quotationDate} /></span>
              <span>Valid until <DateText value={q.validUntil} /></span>
              {q.salesOrderId && <span>Converted to an order</span>}
            </div>

            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 font-medium">Item</th>
                  <th className="text-right py-1.5 font-medium">Qty</th>
                  {showRates && <th className="text-right py-1.5 font-medium">Rate</th>}
                  {showRates && <th className="text-right py-1.5 font-medium">Disc</th>}
                  {showRates && <th className="text-right py-1.5 font-medium">Taxable</th>}
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l) => (
                  <tr key={l.id} className="border-b border-border/50">
                    <td className="py-1.5">
                      {l.product?.name || l.productId}
                      {l.bundleParentProductId && <span className="ml-2 text-xs text-muted-foreground">accessory</span>}
                    </td>
                    <td className="text-right tabular-nums">{l.quantity}</td>
                    {showRates && <td className="text-right tabular-nums">{formatINR(l.ratePaise)}</td>}
                    {showRates && <td className="text-right tabular-nums">{l.discountPercent ? `${l.discountPercent}%` : ''}</td>}
                    {showRates && <td className="text-right tabular-nums">{formatINR(l.taxableAmountPaise)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {showRates && (
              <div className="ml-auto w-full sm:w-72 space-y-1">
                {q.discountPaise > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tabular-nums">−{formatINR(q.discountPaise)}</span></div>
                )}
                <div className="flex justify-between"><span>Taxable</span><span className="tabular-nums">{formatINR(q.subtotalPaise)}</span></div>
                {q.igstPaise > 0 ? (
                  <div className="flex justify-between text-muted-foreground"><span>IGST</span><span className="tabular-nums">{formatINR(q.igstPaise)}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between text-muted-foreground"><span>CGST</span><span className="tabular-nums">{formatINR(q.cgstPaise)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>SGST</span><span className="tabular-nums">{formatINR(q.sgstPaise)}</span></div>
                  </>
                )}
                {q.roundOffPaise !== 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Round off</span><span className="tabular-nums">{formatINR(q.roundOffPaise)}</span></div>
                )}
                <div className="flex justify-between border-t border-border pt-1 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatINR(q.totalPaise)}</span></div>
              </div>
            )}

            {q.terms && <p className="text-xs text-muted-foreground"><span className="font-medium">Terms:</span> {q.terms}</p>}
            {q.notes && <p className="text-xs text-muted-foreground">{q.notes}</p>}
            {q.statusReason && <p className="text-xs text-rose-600">{q.statusReason}</p>}

            {q.isExpired && live && (
              <p className="text-xs text-amber-600">This quotation has expired. Edit it to extend the validity date before converting.</p>
            )}

            {askReject && (
              <div className="space-y-1.5">
                <Label htmlFor="qt-reject">Why was it lost?</Label>
                <Input id="qt-reject" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lost on price to a local supplier" />
              </div>
            )}

            {canModify && live && !q.isExpired && (
              <div className="flex items-end gap-2 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label htmlFor="qt-order-date">Order date</Label>
                  <Input id="qt-order-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="w-40" />
                </div>
                <Button onClick={doConvert} disabled={convert.isPending}>
                  {convert.isPending ? 'Converting…' : <>Convert to sales order <ArrowRight size={15} /></>}
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}><Printer size={15} /> Print</Button>
          {q && canModify && ['DRAFT', 'SENT'].includes(q.status) && (
            <Button type="button" variant="outline" onClick={() => onEdit(q)}>Edit</Button>
          )}
          {q && canModify && q.status === 'DRAFT' && <Button type="button" variant="outline" onClick={() => act('SENT')}>Mark sent</Button>}
          {q && canModify && ['DRAFT', 'SENT'].includes(q.status) && <Button type="button" variant="outline" onClick={() => act('ACCEPTED')}>Mark accepted</Button>}
          {q && canModify && live && (
            askReject
              ? <Button type="button" variant="destructive" disabled={!reason.trim()} onClick={() => act('REJECTED', reason)}>Confirm lost</Button>
              : <Button type="button" variant="outline" onClick={() => setAskReject(true)}>Mark lost</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

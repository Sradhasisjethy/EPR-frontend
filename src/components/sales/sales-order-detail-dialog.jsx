import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { useSalesOrder } from '@/hooks/use-sales';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';

const STATUS_MAP = {
  DRAFT: 'pending', CONFIRMED: 'active', IN_PRODUCTION: 'onboarding', PARTIALLY_DISPATCHED: 'onboarding',
  DISPATCHED: 'active', SHORT_CLOSED: 'suspended', CANCELLED: 'terminated',
};

const Field = ({ label, children }) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{children ?? '—'}</p>
  </div>
);

/**
 * Read-only view of an order and its lines.
 *
 * The list shows only header fields, and the edit dialog is DRAFT-only — so
 * for every order past DRAFT there was previously no way at all to see what
 * was ordered, what has shipped and what is still pending. That is the
 * question the order screen exists to answer.
 */
export function SalesOrderDetailDialog({ open, onOpenChange, orderId }) {
  const { data: order, isLoading, isError } = useSalesOrder(open ? orderId : undefined);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{order ? `Sales Order ${order.orderNumber}` : 'Sales Order'}</DialogTitle>
        </DialogHeader>

        {isLoading && <div className="h-48 rounded-lg border border-border bg-card animate-pulse" />}
        {isError && <div className="p-4 text-sm text-destructive">Failed to load this order.</div>}

        {order && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Customer">{order.customer?.name}</Field>
              <Field label="Status"><StatusBadge status={STATUS_MAP[order.status] || 'pending'} /></Field>
              <Field label="Order Date">{order.orderDate}</Field>
              <Field label="Expected Delivery">{order.expectedDeliveryDate}</Field>
              <Field label="Customer PO">{order.poReferenceNumber}</Field>
              {showRates && <Field label="Order Total">{formatINR(order.totalAmountPaise)}</Field>}
              {order.cancelReason && <Field label="Cancelled Because">{order.cancelReason}</Field>}
              {order.shortCloseReason && <Field label="Short-closed Because">{order.shortCloseReason}</Field>}
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="h-9 px-3 font-medium">Product</th>
                      <th className="h-9 px-3 font-medium text-right">Ordered</th>
                      <th className="h-9 px-3 font-medium text-right">Dispatched</th>
                      <th className="h-9 px-3 font-medium text-right">Pending</th>
                      <th className="h-9 px-3 font-medium text-right">To Produce</th>
                      {showRates && <th className="h-9 px-3 font-medium text-right">Rate</th>}
                      {showRates && <th className="h-9 px-3 font-medium text-right">Amount</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(order.lines || []).map((l) => {
                      const pending = Number(l.orderedQty) - Number(l.dispatchedQty);
                      return (
                        <tr key={l.id} className="border-t border-border/50">
                          <td className="px-3 py-2">{l.product?.name || l.productId}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(l.orderedQty)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(l.dispatchedQty)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{pending}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(l.productionRequired)}</td>
                          {showRates && <td className="px-3 py-2 text-right tabular-nums">{formatINR(l.ratePaise)}</td>}
                          {showRates && (
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatINR(Number(l.ratePaise) * Number(l.orderedQty))}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

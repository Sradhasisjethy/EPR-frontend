import { useCallback, useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { useHotkey } from '@/hooks/use-hotkey';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useSalesOrders, useConfirmSalesOrder, useCancelSalesOrder, useShortCloseSalesOrder } from '@/hooks/use-sales';
import { SalesOrderFormDialog } from '@/components/sales/sales-order-form-dialog';

const STATUS_MAP = {
  DRAFT: 'pending', CONFIRMED: 'active', IN_PRODUCTION: 'onboarding', PARTIALLY_DISPATCHED: 'onboarding',
  DISPATCHED: 'active', SHORT_CLOSED: 'suspended', CANCELLED: 'terminated',
};

export default function SalesOrdersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useSalesOrders);
  const { isLoading, isError } = query;
  const confirmOrder = useConfirmSalesOrder();
  const cancelOrder = useCancelSalesOrder();
  const shortCloseOrder = useShortCloseSalesOrder();

  useHotkey('n', useCallback(() => setDialogOpen(true), []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Orders</h2>
          <p className="text-muted-foreground">Order entry with soft stock reservation and credit control (M06/M07)</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus size={16} /> New Sales Order <KeyHint>N</KeyHint></Button>
      </div>

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load sales orders.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'orderNumber', header: 'Order #' },
            { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
            { accessorKey: 'orderDate', header: 'Order Date' },
            ...(showRates ? [{ id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalAmountPaise) }] : []),
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={STATUS_MAP[row.original.status] || 'pending'} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => {
                const o = row.original;
                return (
                  <div className="flex justify-end gap-2">
                    {o.status === 'DRAFT' && <button className="text-xs text-primary hover:underline" onClick={() => confirmOrder.mutate(o.id)}>Confirm</button>}
                    {['DRAFT', 'CONFIRMED', 'IN_PRODUCTION'].includes(o.status) && (
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => {
                          const reason = window.prompt('Cancellation reason:');
                          if (reason) cancelOrder.mutate({ id: o.id, reason });
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    {o.status === 'PARTIALLY_DISPATCHED' && (
                      <button
                        className="text-xs text-amber-600 hover:underline"
                        onClick={() => {
                          const reason = window.prompt('Short-close reason:');
                          if (reason) shortCloseOrder.mutate({ id: o.id, reason });
                        }}
                      >
                        Short-close
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search order number…"
        />
      )}

      <SalesOrderFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

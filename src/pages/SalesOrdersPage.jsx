import { useCallback, useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Eye, Factory as FactoryIcon } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { useHotkey } from '@/hooks/use-hotkey';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  useSalesOrders, useConfirmSalesOrder, useCancelSalesOrder, useShortCloseSalesOrder, useMarkInProduction,
} from '@/hooks/use-sales';
import { SalesOrderFormDialog } from '@/components/sales/sales-order-form-dialog';
import { SalesOrderDetailDialog } from '@/components/sales/sales-order-detail-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';

const STATUS_MAP = {
  DRAFT: 'pending', CONFIRMED: 'active', IN_PRODUCTION: 'onboarding', PARTIALLY_DISPATCHED: 'onboarding',
  DISPATCHED: 'active', SHORT_CLOSED: 'suspended', CANCELLED: 'terminated',
};

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'IN_PRODUCTION', label: 'In Production' },
  { key: 'PARTIALLY_DISPATCHED', label: 'Partially Dispatched' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'SHORT_CLOSED', label: 'Short-closed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// Must match the allow-list SalesService.listSalesOrders passes to `toOrder`.
const SORTABLE_COLUMNS = ['orderNumber', 'orderDate', 'status', 'totalAmountPaise'];

export default function SalesOrdersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [status, setStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const [reasonPrompt, setReasonPrompt] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const canCreate = hasPermission(user, 'SALES_CREATE');
  const canModify = hasPermission(user, 'SALES_MODIFY');

  const { query, tableProps } = usePaginated(
    useSalesOrders,
    { status: status || undefined },
    { sortableColumns: SORTABLE_COLUMNS }
  );
  const { isLoading, isError } = query;

  const confirmOrder = useConfirmSalesOrder();
  const cancelOrder = useCancelSalesOrder();
  const shortCloseOrder = useShortCloseSalesOrder();
  const markInProduction = useMarkInProduction();

  useHotkey('n', useCallback(() => { setEditingOrder(null); setDialogOpen(true); }, []));

  // Every transition can legitimately be refused by the API (stock shortfall,
  // an invalid status move, a location the user may not touch). Without this
  // the mutation failed and the row simply did not change, with no explanation.
  const run = (mutation, arg) => {
    setActionError('');
    mutation.mutate(arg, {
      onError: (err) => setActionError(err.response?.data?.message || 'That action could not be completed.'),
    });
  };

  const promptAndRun = ({ title, description, label, placeholder, confirmText = 'Submit', variant = 'destructive', mutation, id }) => {
    setReasonPrompt({
      title,
      description,
      label,
      placeholder,
      confirmText,
      variant,
      onConfirm: async (reason) => {
        setActionError('');
        try {
          await mutation.mutateAsync({ id, reason });
        } catch (err) {
          setActionError(err.response?.data?.message || 'That action could not be completed.');
          throw err;
        }
      },
    });
  };

  const openEdit = (order) => { setEditingOrder(order); setDialogOpen(true); };

  return (
    <div className="space-y-6">

      

      <div className="flex flex-wrap border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              status === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setStatus(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{actionError}</div>
      )}

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
            { id: 'expected', header: 'Expected', cell: ({ row }) => row.original.expectedDeliveryDate || '—' },
            ...(showRates ? [{ accessorKey: 'totalAmountPaise', header: 'Total', cell: ({ row }) => formatINR(row.original.totalAmountPaise) }] : []),
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={STATUS_MAP[row.original.status] || 'pending'} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => {
                const o = row.original;
                return (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="View lines, dispatched and pending quantities"
                      onClick={() => setDetailId(o.id)}
                    >
                      <Eye size={16} />
                    </button>

                    {/* Only a DRAFT is editable — a confirmed order holds stock. */}
                    {o.status === 'DRAFT' && canModify && (
                      <button
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit draft"
                        onClick={() => openEdit(o)}
                      >
                        <Pencil size={16} />
                      </button>
                    )}

                    {o.status === 'DRAFT' && canModify && (
                      <button className="text-xs text-primary hover:underline" onClick={() => run(confirmOrder, o.id)}>Confirm</button>
                    )}

                    {o.status === 'CONFIRMED' && canModify && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
                        title="Flag this order as waiting on manufacture"
                        onClick={() => run(markInProduction, o.id)}
                      >
                        <FactoryIcon size={13} /> In production
                      </button>
                    )}

                    {['DRAFT', 'CONFIRMED', 'IN_PRODUCTION'].includes(o.status) && canModify && (
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() =>
                          promptAndRun({
                            title: `Cancel Sales Order — ${o.orderNumber}`,
                            description: 'Are you sure you want to cancel this sales order? This will release reserved stock balance and mark the order as cancelled.',
                            label: 'Cancellation Reason',
                            placeholder: 'e.g. Customer cancelled order, duplicate entry...',
                            confirmText: 'Cancel Order',
                            variant: 'destructive',
                            mutation: cancelOrder,
                            id: o.id,
                          })
                        }
                      >
                        Cancel
                      </button>
                    )}

                    {['PARTIALLY_DISPATCHED', 'CONFIRMED', 'IN_PRODUCTION'].includes(o.status) && canModify && (
                      <button
                        className="text-xs text-amber-600 hover:underline"
                        title="Close the undelivered balance and release its stock hold"
                        onClick={() =>
                          promptAndRun({
                            title: `Short-close Sales Order — ${o.orderNumber}`,
                            description: 'Close the undelivered balance and release its stock hold.',
                            label: 'Short-close Reason',
                            placeholder: 'e.g. Customer requested partial delivery only, balance order cancelled...',
                            confirmText: 'Short-close Order',
                            variant: 'default',
                            mutation: shortCloseOrder,
                            id: o.id,
                          })
                        }
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
          emptyMessage="No sales orders here yet. Raise one to reserve stock against a customer."
          actionsNode={canCreate && (
          <Button onClick={() => { setEditingOrder(null); setDialogOpen(true); }}>
            <Plus size={16} /> New Sales Order <KeyHint>N</KeyHint>
          </Button>
        )}
          searchPlaceholder="Search order number, customer or PO reference…"
        />
      )}

      <SalesOrderFormDialog open={dialogOpen} onOpenChange={setDialogOpen} order={editingOrder} />
      <SalesOrderDetailDialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} orderId={detailId} />

      <ReasonDialog
        open={!!reasonPrompt}
        onOpenChange={(open) => !open && setReasonPrompt(null)}
        title={reasonPrompt?.title}
        description={reasonPrompt?.description}
        label={reasonPrompt?.label}
        placeholder={reasonPrompt?.placeholder}
        confirmText={reasonPrompt?.confirmText}
        variant={reasonPrompt?.variant}
        onConfirm={reasonPrompt?.onConfirm}
      />
    </div>
  );
}

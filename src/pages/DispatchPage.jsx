import { useCallback, useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Printer } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { useHotkey } from '@/hooks/use-hotkey';
import { useDeliveryChallans, useCancelChallan, openChallanPrint } from '@/hooks/use-dispatch';
import { CreateChallanDialog } from '@/components/dispatch/create-challan-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { toast } from 'sonner';
import { DateText } from '@/components/date-text';

export default function DispatchPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancellingChallan, setCancellingChallan] = useState(null);
  const { query, tableProps } = usePaginated(useDeliveryChallans);
  const { isLoading, isError } = query;
  const cancelChallan = useCancelChallan();

  // M19 keyboard-first framework baseline: "n" opens the primary create
  // action from anywhere on the page (unless a text field currently has focus).
  useHotkey('n', useCallback(() => setDialogOpen(true), []));

  return (
    <div className="space-y-6">

      

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load delivery challans.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'challanNumber', header: 'Challan #' },
            { id: 'order', header: 'Order #', cell: ({ row }) => row.original.salesOrder?.orderNumber },
            { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.salesOrder?.customer?.name },
            { accessorKey: 'vehicleNumber', header: 'Vehicle' },
            { id: 'dispatchDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.dispatchDate} /> },
            { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length ?? 0 },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'DISPATCHED' ? 'active' : 'terminated'} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => (
                <div className="flex justify-end gap-3">
                  {['a4', 'thermal'].map((format) => (
                    <button
                      key={format}
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={() =>
                        openChallanPrint(row.original.id, format).catch((err) =>
                          toast.error(err.response?.data?.message || 'Could not open the challan.')
                        )
                      }
                    >
                      <Printer size={12} /> {format === 'a4' ? 'A4' : 'Thermal'}
                    </button>
                  ))}
                  {row.original.status === 'DISPATCHED' && (
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={() => setCancellingChallan(row.original)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search challan no, vehicle, driver…"
          actionsNode={
            <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> New Delivery Challan <KeyHint>N</KeyHint>
        </Button>
          }
        />
      )}

      <CreateChallanDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ReasonDialog
        open={!!cancellingChallan}
        onOpenChange={(open) => !open && setCancellingChallan(null)}
        title={`Cancel Delivery Challan — ${cancellingChallan?.challanNumber}`}
        description="Are you sure you want to cancel this delivery challan? This action will reverse the dispatched inventory and mark the challan as cancelled."
        label="Cancellation Reason"
        placeholder="e.g. Dispatched by mistake, customer cancelled order, vehicle breakdown..."
        confirmText="Cancel Challan"
        variant="destructive"
        onConfirm={async (reason) => {
          if (!cancellingChallan) return;
          try {
            await cancelChallan.mutateAsync({ id: cancellingChallan.id, reason });
            toast.success('Delivery challan cancelled successfully');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel the challan.');
            throw err;
          }
        }}
      />
    </div>
  );
}

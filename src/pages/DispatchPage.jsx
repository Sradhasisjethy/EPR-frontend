import { useCallback, useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Printer } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { useHotkey } from '@/hooks/use-hotkey';
import { useDeliveryChallans, useCancelChallan, getChallanPrintUrl } from '@/hooks/use-dispatch';
import { CreateChallanDialog } from '@/components/dispatch/create-challan-dialog';

export default function DispatchPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
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
            { accessorKey: 'dispatchDate', header: 'Date' },
            { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length ?? 0 },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'DISPATCHED' ? 'active' : 'terminated'} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => (
                <div className="flex justify-end gap-3">
                  <a
                    href={getChallanPrintUrl(row.original.id, 'a4')}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Printer size={12} /> A4
                  </a>
                  <a
                    href={getChallanPrintUrl(row.original.id, 'thermal')}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Printer size={12} /> Thermal
                  </a>
                  {row.original.status === 'DISPATCHED' && (
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={() => {
                        const reason = window.prompt('Cancellation reason:');
                        if (reason) cancelChallan.mutate({ id: row.original.id, reason });
                      }}
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
    </div>
  );
}

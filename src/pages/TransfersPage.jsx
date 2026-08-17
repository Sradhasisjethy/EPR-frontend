import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTransfers, useCancelTransfer } from '@/hooks/use-transfer';
import { useFactories } from '@/hooks/use-factory';
import { InitiateTransferDialog } from '@/components/transfer/initiate-transfer-dialog';
import { ReceiveTransferDialog } from '@/components/transfer/receive-transfer-dialog';

const STATUS_STYLES = {
  IN_TRANSIT: 'bg-violet-500/10 text-violet-600',
  RECEIVED: 'bg-emerald-500/10 text-emerald-600',
  CANCELLED: 'bg-slate-500/10 text-slate-600',
};

export default function TransfersPage() {
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState(null);

  const { query, tableProps } = usePaginated(useTransfers);
  const { isLoading, isError } = query;
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const cancelTransfer = useCancelTransfer();
  const factoryName = (id) => factoryData?.rows?.find((f) => f.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inter-Factory Transfers</h2>
          <p className="text-muted-foreground">Multi-location stock with in-transit tracking (M14)</p>
        </div>
        <Button onClick={() => setInitiateOpen(true)}><Plus size={16} /> Initiate Transfer</Button>
      </div>

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load transfers.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'transferNumber', header: 'Transfer #' },
            { id: 'from', header: 'From', cell: ({ row }) => factoryName(row.original.fromFactoryId) },
            { id: 'to', header: 'To', cell: ({ row }) => factoryName(row.original.toFactoryId) },
            { accessorKey: 'initiatedDate', header: 'Initiated' },
            { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length ?? 0 },
            {
              id: 'status', header: 'Status',
              cell: ({ row }) => (
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[row.original.status])}>
                  {row.original.status.replace('_', ' ')}
                </span>
              ),
            },
            {
              id: 'actions', header: '',
              cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                  {row.original.status === 'IN_TRANSIT' && (
                    <>
                      <button className="text-xs text-primary hover:underline" onClick={() => setReceivingTransfer(row.original)}>Receive</button>
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => {
                          const reason = window.prompt('Cancellation reason:');
                          if (reason) cancelTransfer.mutate({ id: row.original.id, reason });
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search transfer no, vehicle…"
        />
      )}

      <InitiateTransferDialog open={initiateOpen} onOpenChange={setInitiateOpen} />
      <ReceiveTransferDialog open={!!receivingTransfer} onOpenChange={(open) => !open && setReceivingTransfer(null)} transfer={receivingTransfer} />
    </div>
  );
}

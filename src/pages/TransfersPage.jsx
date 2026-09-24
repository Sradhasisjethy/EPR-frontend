import { useState } from 'react';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTransfers, useCancelTransfer } from '@/hooks/use-transfer';
import { useFactories } from '@/hooks/use-factory';
import { InitiateTransferDialog } from '@/components/transfer/initiate-transfer-dialog';
import { ReceiveTransferDialog } from '@/components/transfer/receive-transfer-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { toast } from 'sonner';
import { DateText } from '@/components/date-text';

const STATUS_STYLES = {
  IN_TRANSIT: 'bg-violet-500/10 text-violet-600',
  RECEIVED: 'bg-emerald-500/10 text-emerald-600',
  CANCELLED: 'bg-slate-500/10 text-slate-600',
};

export default function TransfersPage() {
  const { data: user } = useCurrentUser();
  const canCreate = hasPermission(user, WebPermissions.TRANSFER_CREATE);
  const canModify = hasPermission(user, WebPermissions.TRANSFER_MODIFY);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState(null);
  const [cancellingTransfer, setCancellingTransfer] = useState(null);

  const { query, tableProps } = usePaginated(useTransfers);
  const { isLoading, isError } = query;
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const cancelTransfer = useCancelTransfer();
  const factoryName = (id) => factoryData?.rows?.find((f) => f.id === id)?.name || id;

  return (
    <div className="space-y-6">

      

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
            { id: 'initiatedDate', header: 'Initiated', cell: ({ row }) => <DateText value={row.original.initiatedDate} /> },
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
                  {canModify && row.original.status === 'IN_TRANSIT' && (
                    <>
                      <button className="text-xs text-primary hover:underline" onClick={() => setReceivingTransfer(row.original)}>Receive</button>
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => setCancellingTransfer(row.original)}
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
          actionsNode={
            canCreate && <Button onClick={() => setInitiateOpen(true)}><Plus size={16} /> Initiate Transfer</Button>
          }
        />
      )}

      <InitiateTransferDialog open={initiateOpen} onOpenChange={setInitiateOpen} />
      <ReceiveTransferDialog open={!!receivingTransfer} onOpenChange={(open) => !open && setReceivingTransfer(null)} transfer={receivingTransfer} />

      <ReasonDialog
        open={!!cancellingTransfer}
        onOpenChange={(open) => !open && setCancellingTransfer(null)}
        title={`Cancel Transfer — ${cancellingTransfer?.transferNumber}`}
        description="Are you sure you want to cancel this transfer? This action will restore transferred stock to the sending factory and cannot be undone."
        label="Cancellation Reason"
        placeholder="e.g. Transfer cancelled, wrong destination factory, vehicle issue..."
        confirmText="Cancel Transfer"
        variant="destructive"
        onConfirm={async (reason) => {
          if (!cancellingTransfer) return;
          try {
            await cancelTransfer.mutateAsync({ id: cancellingTransfer.id, reason });
            toast.success('Transfer cancelled successfully');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel transfer.');
            throw err;
          }
        }}
      />
    </div>
  );
}

import { useCallback, useState } from 'react';
import { Plus, Printer, Truck } from 'lucide-react';
import { usePaginated } from '@/hooks/use-paginated';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { useHotkey } from '@/hooks/use-hotkey';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { DateText } from '@/components/date-text';
import { useCounterSales } from '@/hooks/use-counter-sales';
import { openInvoicePrint, useCancelInvoice } from '@/hooks/use-invoicing';
import { CounterSaleDialog } from '@/components/sales/counter-sale-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { toast } from 'sonner';

/**
 * Counter sales are sales invoices raised at the till rather than from a
 * dispatched challan, so everything here — printing, cancelling, the outstanding
 * figure — goes through the same endpoints the invoice register uses. The only
 * difference is which rows are listed.
 */
export default function CounterSalesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useCounterSales);
  const { isLoading, isError } = query;
  const cancelInvoice = useCancelInvoice();

  useHotkey('n', useCallback(() => setDialogOpen(true), []));

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load counter sales.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'invoiceNumber', header: 'Invoice #' },
            {
              id: 'customer',
              header: 'Buyer',
              cell: ({ row }) => (
                <div className="flex items-center gap-2">
                  <span>{row.original.customer?.name || '—'}</span>
                  {row.original.vehicleNumber && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={`Delivered — ${row.original.vehicleNumber}`}>
                      <Truck size={11} /> {row.original.vehicleNumber}
                    </span>
                  )}
                </div>
              ),
            },
            { id: 'invoiceDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.invoiceDate} /> },
            ...(showRates
              ? [
                  { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalPaise) },
                  {
                    id: 'outstanding',
                    header: 'Outstanding',
                    cell: ({ row }) => {
                      const due = Number(row.original.outstandingPaise ?? 0);
                      return (
                        <span className={due > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}>
                          {due > 0 ? formatINR(due) : 'Paid'}
                        </span>
                      );
                    },
                  },
                ]
              : []),
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
            {
              id: 'actions',
              header: '',
              cell: ({ row }) => (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() =>
                      openInvoicePrint(row.original.id).catch((err) =>
                        toast.error(err.response?.data?.message || 'Could not open the invoice.')
                      )
                    }
                  >
                    <Printer size={12} /> Print
                  </button>
                  {row.original.status === 'POSTED' && (
                    <button className="text-xs text-destructive hover:underline" onClick={() => setCancelling(row.original)}>Cancel</button>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search invoice number…"
          actionsNode={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={16} /> New Counter Sale <KeyHint>N</KeyHint>
            </Button>
          }
        />
      )}

      <CounterSaleDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ReasonDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel Sale — ${cancelling?.invoiceNumber}`}
        description="This reverses the ledger entries and returns the goods to stock. If money was taken, cancel the receipt first."
        label="Cancellation Reason"
        placeholder="e.g. Customer changed their mind, wrong item issued…"
        confirmText="Cancel Sale"
        variant="destructive"
        onConfirm={async (reason) => {
          if (!cancelling) return;
          try {
            await cancelInvoice.mutateAsync({ id: cancelling.id, reason });
            toast.success('Counter sale cancelled — stock returned');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel the sale.');
            throw err;
          }
        }}
      />
    </div>
  );
}

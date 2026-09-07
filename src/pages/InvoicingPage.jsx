import { useCallback, useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Printer } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { useHotkey } from '@/hooks/use-hotkey';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useSalesInvoices, useCancelInvoice, openInvoicePrint } from '@/hooks/use-invoicing';
import { CreateInvoiceDialog } from '@/components/invoicing/create-invoice-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { toast } from 'sonner';
import { DateText } from '@/components/date-text';

export default function InvoicingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancellingInvoice, setCancellingInvoice] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useSalesInvoices);
  const { isLoading, isError } = query;
  const cancelInvoice = useCancelInvoice();

  useHotkey('n', useCallback(() => setDialogOpen(true), []));

  const handleCancel = (invoice) => {
    setCancellingInvoice(invoice);
  };

  return (
    <div className="space-y-6">

      

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load invoices.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'invoiceNumber', header: 'Invoice #' },
            { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
            { id: 'invoiceDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.invoiceDate} /> },
            ...(showRates
              ? [
                  { id: 'taxable', header: 'Taxable', cell: ({ row }) => formatINR(row.original.subtotalPaise) },
                  { id: 'gst', header: 'GST', cell: ({ row }) => formatINR(Number(row.original.cgstPaise) + Number(row.original.sgstPaise) + Number(row.original.igstPaise)) },
                  { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalPaise) },
                ]
              : []),
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
            {
              id: 'actions', header: '',
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
                    <button className="text-xs text-destructive hover:underline" onClick={() => handleCancel(row.original)}>Cancel</button>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search invoice number…"
          actionsNode={
            <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> New Invoice <KeyHint>N</KeyHint>
        </Button>
          }
        />
      )}

      <CreateInvoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ReasonDialog
        open={!!cancellingInvoice}
        onOpenChange={(open) => !open && setCancellingInvoice(null)}
        title={`Cancel Invoice — ${cancellingInvoice?.invoiceNumber}`}
        description="Are you sure you want to cancel this invoice? This action will mark the invoice as cancelled and reverse posted general ledger entries."
        label="Cancellation Reason"
        placeholder="e.g. Billing correction, duplicate invoice raised, customer return..."
        confirmText="Cancel Invoice"
        variant="destructive"
        onConfirm={async (reason) => {
          if (!cancellingInvoice) return;
          try {
            await cancelInvoice.mutateAsync({ id: cancellingInvoice.id, reason });
            toast.success('Invoice cancelled successfully');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel invoice.');
            throw err;
          }
        }}
      />
    </div>
  );
}

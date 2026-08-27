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
import { useSalesInvoices, useCancelInvoice } from '@/hooks/use-invoicing';
import { CreateInvoiceDialog } from '@/components/invoicing/create-invoice-dialog';

export default function InvoicingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useSalesInvoices);
  const { isLoading, isError } = query;
  const cancelInvoice = useCancelInvoice();

  useHotkey('n', useCallback(() => setDialogOpen(true), []));

  const handleCancel = (invoice) => {
    const reason = window.prompt('Cancellation reason:');
    if (reason) cancelInvoice.mutate({ id: invoice.id, reason });
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
            { accessorKey: 'invoiceDate', header: 'Date' },
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
                <div className="flex justify-end gap-2">
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
    </div>
  );
}

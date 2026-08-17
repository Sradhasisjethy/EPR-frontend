import { useState } from 'react';
import { useCheques, usePresentCheque, useClearCheque } from '@/hooks/use-cheques';
import { BounceChequeDialog } from '@/components/payments/bounce-cheque-dialog';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { usePaginated } from '@/hooks/use-paginated';
import { useReceipts, useCancelReceipt, usePayments, useCancelPayment } from '@/hooks/use-payments';
import { ReceiptFormDialog } from '@/components/payments/receipt-form-dialog';
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Receipts', 'Payments', 'Cheques'];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Receipts');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [bouncingCheque, setBouncingCheque] = useState(null);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const receipts = usePaginated(useReceipts);
  const cancelReceipt = useCancelReceipt();
  const payments = usePaginated(usePayments);
  const cancelPayment = useCancelPayment();
  const cheques = usePaginated(useCheques);
  const presentCheque = usePresentCheque();
  const clearCheque = useClearCheque();

  // Cheques are created by receipts/payments, never on their own — so the
  // Cheques tab has no "add" action.
  const addHandlers = { Receipts: () => setReceiptDialogOpen(true), Payments: () => setPaymentDialogOpen(true) };

  const cancelWithReason = (mutation, id) => {
    const reason = window.prompt('Cancellation reason:');
    if (reason) mutation.mutate({ id, reason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Receipts & Payments</h2>
          <p className="text-muted-foreground">Customer receipts and vendor/contractor/labour payments with invoice allocation (M24/M25)</p>
        </div>
        {addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
      </div>

      <div className="flex border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Receipts' && (
        receipts.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'receiptNumber', header: 'Receipt #' },
              { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
              { accessorKey: 'receiptDate', header: 'Date' },
              ...(showRates
                ? [
                    { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalAmountPaise) },
                    { id: 'unallocated', header: 'Unallocated', cell: ({ row }) => formatINR(row.original.unallocatedAmountPaise) },
                  ]
                : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelReceipt, row.original.id)}>Cancel</button></div>
                ),
              },
            ]}
            {...receipts.tableProps}
            searchPlaceholder="Search receipt number…"
          />
        )
      )}

      {activeTab === 'Payments' && (
        payments.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'paymentNumber', header: 'Payment #' },
              { id: 'party', header: 'Paid To', cell: ({ row }) => row.original.party?.name },
              { accessorKey: 'paymentDate', header: 'Date' },
              ...(showRates
                ? [
                    { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalAmountPaise) },
                    { id: 'unallocated', header: 'Unallocated', cell: ({ row }) => formatINR(row.original.unallocatedAmountPaise) },
                  ]
                : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelPayment, row.original.id)}>Cancel</button></div>
                ),
              },
            ]}
            {...payments.tableProps}
            searchPlaceholder="Search payment number…"
          />
        )
      )}

      {activeTab === 'Cheques' && (
        cheques.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'chequeNumber', header: 'Cheque #' },
              { accessorKey: 'bankName', header: 'Bank' },
              { id: 'party', header: 'Party', cell: ({ row }) => row.original.party?.name },
              { accessorKey: 'direction', header: 'Direction' },
              { accessorKey: 'chequeDate', header: 'Date' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-2">
                    {/* A cheque only moves forward: ISSUED -> PRESENTED -> CLEARED|BOUNCED */}
                    {row.original.status === 'ISSUED' && (
                      <button className="text-xs text-primary hover:underline" onClick={() => presentCheque.mutate({ id: row.original.id })}>
                        Mark presented
                      </button>
                    )}
                    {row.original.status === 'PRESENTED' && (
                      <>
                        <button className="text-xs text-emerald-600 hover:underline" onClick={() => clearCheque.mutate({ id: row.original.id })}>
                          Cleared
                        </button>
                        <button className="text-xs text-destructive hover:underline" onClick={() => setBouncingCheque(row.original)}>
                          Bounced
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
            {...cheques.tableProps}
            searchPlaceholder="Search cheque number or bank…"
            emptyMessage="No cheques yet — they appear here when a receipt or payment uses cheque mode."
          />
        )
      )}

      <BounceChequeDialog open={!!bouncingCheque} onOpenChange={(v) => !v && setBouncingCheque(null)} cheque={bouncingCheque} />
      <ReceiptFormDialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen} />
      <PaymentFormDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} />
    </div>
  );
}

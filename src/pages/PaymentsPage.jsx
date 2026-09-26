import { useState } from 'react';
import { useCheques, usePresentCheque, useClearCheque } from '@/hooks/use-cheques';
import { BounceChequeDialog } from '@/components/payments/bounce-cheque-dialog';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { PaymentDetailDialog } from '@/components/payments/payment-detail-dialog';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { usePaginated } from '@/hooks/use-paginated';
import { useReceipts, useCancelReceipt, usePayments, useCancelPayment } from '@/hooks/use-payments';
import { ReceiptFormDialog } from '@/components/payments/receipt-form-dialog';
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { useTabParam } from '@/hooks/use-tab-param';
import { useUIStore } from '@/store/ui-store';
import { toast } from 'sonner';
import { DateText } from '@/components/date-text';

const TABS = ['Receipts', 'Payments', 'Cheques'];

export default function PaymentsPage() {
  const { glassMode } = useUIStore();
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Receipts', 'subtab');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [bouncingCheque, setBouncingCheque] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(null);
  const [viewing, setViewing] = useState(null); // { kind, record }

  const { data: user } = useCurrentUser();
  const canCreateReceipt = hasPermission(user, WebPermissions.RECEIPT_CREATE);
  const canCreatePayment = hasPermission(user, WebPermissions.PAYMENT_CREATE);
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
  // Money in and money out are separate grants, so the two tabs gate apart.
  const addHandlers = {
    ...(canCreateReceipt ? { Receipts: () => setReceiptDialogOpen(true) } : {}),
    ...(canCreatePayment ? { Payments: () => setPaymentDialogOpen(true) } : {}),
  };

  const cancelWithReason = (mutation, id, title) => {
    setCancelPrompt({ mutation, id, title });
  };

  return (
    <div className="space-y-6">
      

      {glassMode ? (
        <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto shadow-xs mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-foreground/75 hover:text-foreground hover:bg-card/70'
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex border-b border-border mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer', activeTab === tab ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground')}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'Receipts' && (
        receipts.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'receiptNumber', header: 'Receipt #' },
              { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
              { id: 'receiptDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.receiptDate} /> },
              ...(showRates
                ? [
                    { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalAmountPaise) },
                    { id: 'unallocated', header: 'Unallocated', cell: ({ row }) => formatINR(row.original.unallocatedAmountPaise) },
                  ]
                : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setViewing({ kind: 'Receipts', record: row.original })}
                    >
                      View
                    </button>
                    {row.original.status === 'POSTED' && (
                      <button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelReceipt, row.original.id, `Cancel Receipt — ${row.original.receiptNumber}`)}>Cancel</button>
                    )}
                  </div>
                ),
              },
            ]}
            {...receipts.tableProps}
            searchPlaceholder="Search receipt number…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
          />
        )
      )}

      {activeTab === 'Payments' && (
        payments.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'paymentNumber', header: 'Payment #' },
              { id: 'party', header: 'Paid To', cell: ({ row }) => row.original.party?.name },
              { id: 'paymentDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.paymentDate} /> },
              ...(showRates
                ? [
                    { id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalAmountPaise) },
                    { id: 'unallocated', header: 'Unallocated', cell: ({ row }) => formatINR(row.original.unallocatedAmountPaise) },
                  ]
                : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setViewing({ kind: 'Payments', record: row.original })}
                    >
                      View
                    </button>
                    {row.original.status === 'POSTED' && (
                      <button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelPayment, row.original.id, `Cancel Payment — ${row.original.paymentNumber}`)}>Cancel</button>
                    )}
                  </div>
                ),
              },
            ]}
            {...payments.tableProps}
            searchPlaceholder="Search payment number…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
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
              { id: 'chequeDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.chequeDate} /> },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setViewing({ kind: 'Cheques', record: row.original })}
                    >
                      View
                    </button>
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
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
            emptyMessage="No cheques yet — they appear here when a receipt or payment uses cheque mode."
          />
        )
      )}

      <BounceChequeDialog open={!!bouncingCheque} onOpenChange={(v) => !v && setBouncingCheque(null)} cheque={bouncingCheque} />
      <ReceiptFormDialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen} />
      <PaymentFormDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} />

      <PaymentDetailDialog
        open={!!viewing}
        onOpenChange={(next) => !next && setViewing(null)}
        kind={viewing?.kind}
        record={viewing?.record}
      />
      <ReasonDialog
        open={!!cancelPrompt}
        onOpenChange={(open) => !open && setCancelPrompt(null)}
        title={cancelPrompt?.title || 'Cancellation'}
        description="Are you sure you want to cancel this record? This action will reverse posted journal entries and cannot be undone."
        label="Cancellation Reason"
        placeholder="e.g. Duplicate entry, incorrect bank account selected, payment cancelled..."
        confirmText="Confirm Cancellation"
        variant="destructive"
        onConfirm={async (reason) => {
          if (!cancelPrompt) return;
          try {
            await cancelPrompt.mutation.mutateAsync({ id: cancelPrompt.id, reason });
            toast.success('Cancelled successfully');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel record.');
            throw err;
          }
        }}
      />
    </div>
  );
}

import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { useSalesReturns, useCancelSalesReturn, usePurchaseReturns, useCancelPurchaseReturn, useCreditNotes, useCancelCreditNote, useDebitNotes, useCancelDebitNote } from '@/hooks/use-returns';
import { SalesReturnFormDialog } from '@/components/returns/sales-return-form-dialog';
import { PurchaseReturnFormDialog } from '@/components/returns/purchase-return-form-dialog';
import { CreditNoteFormDialog } from '@/components/returns/credit-note-form-dialog';
import { DebitNoteFormDialog } from '@/components/returns/debit-note-form-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { useTabParam } from '@/hooks/use-tab-param';
import { useUIStore } from '@/store/ui-store';
import { toast } from 'sonner';
import { DateText } from '@/components/date-text';

const TABS = ['Sales Returns', 'Purchase Returns', 'Credit Notes', 'Debit Notes'];

export default function ReturnsPage() {
  const { glassMode } = useUIStore();
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Sales Returns', 'subtab');
  const [salesReturnOpen, setSalesReturnOpen] = useState(false);
  const [purchaseReturnOpen, setPurchaseReturnOpen] = useState(false);
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const [debitNoteOpen, setDebitNoteOpen] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(null);

  const { data: user } = useCurrentUser();
  const canCreate = hasPermission(user, WebPermissions.RETURN_CREATE);
  // Cancels are named grants: returns on RETURN_CANCEL, notes on FINANCE_ADJUSTMENT_CANCEL.
  const canCancelReturn = hasPermission(user, WebPermissions.RETURN_CANCEL);
  const canCancelNote = hasPermission(user, WebPermissions.FINANCE_ADJUSTMENT_CANCEL);
  const showRates = canViewRates(user);

  const salesReturns = usePaginated(useSalesReturns);
  const cancelSalesReturn = useCancelSalesReturn();
  const purchaseReturns = usePaginated(usePurchaseReturns);
  const cancelPurchaseReturn = useCancelPurchaseReturn();
  const creditNotes = usePaginated(useCreditNotes);
  const cancelCreditNote = useCancelCreditNote();
  const debitNotes = usePaginated(useDebitNotes);
  const cancelDebitNote = useCancelDebitNote();

  // Gated as a map rather than per button: all four documents are creates on
  // the same resource, and the "New …" buttons all read from this.
  const addHandlers = canCreate ? {
    'Sales Returns': () => setSalesReturnOpen(true),
    'Purchase Returns': () => setPurchaseReturnOpen(true),
    'Credit Notes': () => setCreditNoteOpen(true),
    'Debit Notes': () => setDebitNoteOpen(true),
  } : {};

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

      {activeTab === 'Sales Returns' && (
        salesReturns.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'returnNumber', header: 'Return #' },
              { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
              { id: 'returnDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.returnDate} /> },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.totalAmountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => canCancelReturn && row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelSalesReturn, row.original.id, `Cancel Sales Return — ${row.original.returnNumber}`)}>Cancel</button></div>
                ),
              },
            ]}
            {...salesReturns.tableProps}
            searchPlaceholder="Search return no, reason…"
          actionsNode={addHandlers[activeTab] && (
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          )}
          />
        )
      )}

      {activeTab === 'Purchase Returns' && (
        purchaseReturns.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'returnNumber', header: 'Return #' },
              { id: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name },
              { id: 'returnDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.returnDate} /> },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.totalAmountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => canCancelReturn && row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelPurchaseReturn, row.original.id, `Cancel Purchase Return — ${row.original.returnNumber}`)}>Cancel</button></div>
                ),
              },
            ]}
            {...purchaseReturns.tableProps}
            searchPlaceholder="Search return no, reason…"
          actionsNode={addHandlers[activeTab] && (
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          )}
          />
        )
      )}

      {activeTab === 'Credit Notes' && (
        creditNotes.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'noteNumber', header: 'Note #' },
              { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
              { id: 'noteDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.noteDate} /> },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => canCancelNote && row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelCreditNote, row.original.id, `Cancel Credit Note — ${row.original.noteNumber}`)}>Cancel</button></div>
                ),
              },
            ]}
            {...creditNotes.tableProps}
            searchPlaceholder="Search note no, reason…"
          actionsNode={addHandlers[activeTab] && (
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          )}
          />
        )
      )}

      {activeTab === 'Debit Notes' && (
        debitNotes.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'noteNumber', header: 'Note #' },
              { id: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name },
              { id: 'noteDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.noteDate} /> },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => canCancelNote && row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelDebitNote, row.original.id, `Cancel Debit Note — ${row.original.noteNumber}`)}>Cancel</button></div>
                ),
              },
            ]}
            {...debitNotes.tableProps}
            searchPlaceholder="Search note no, reason…"
          actionsNode={addHandlers[activeTab] && (
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          )}
          />
        )
      )}

      <SalesReturnFormDialog open={salesReturnOpen} onOpenChange={setSalesReturnOpen} />
      <PurchaseReturnFormDialog open={purchaseReturnOpen} onOpenChange={setPurchaseReturnOpen} />
      <CreditNoteFormDialog open={creditNoteOpen} onOpenChange={setCreditNoteOpen} />
      <DebitNoteFormDialog open={debitNoteOpen} onOpenChange={setDebitNoteOpen} />

      <ReasonDialog
        open={!!cancelPrompt}
        onOpenChange={(open) => !open && setCancelPrompt(null)}
        title={cancelPrompt?.title || 'Cancellation'}
        description="Are you sure you want to cancel this record? This action will reverse stock/ledger entries and mark it as cancelled."
        label="Cancellation Reason"
        placeholder="e.g. Posted in error, customer return superseded..."
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

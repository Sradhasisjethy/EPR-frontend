import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useSalesReturns, useCancelSalesReturn, usePurchaseReturns, useCancelPurchaseReturn, useCreditNotes, useCancelCreditNote, useDebitNotes, useCancelDebitNote } from '@/hooks/use-returns';
import { SalesReturnFormDialog } from '@/components/returns/sales-return-form-dialog';
import { PurchaseReturnFormDialog } from '@/components/returns/purchase-return-form-dialog';
import { CreditNoteFormDialog } from '@/components/returns/credit-note-form-dialog';
import { DebitNoteFormDialog } from '@/components/returns/debit-note-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Sales Returns', 'Purchase Returns', 'Credit Notes', 'Debit Notes'];

export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Sales Returns', 'subtab');
  const [salesReturnOpen, setSalesReturnOpen] = useState(false);
  const [purchaseReturnOpen, setPurchaseReturnOpen] = useState(false);
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const [debitNoteOpen, setDebitNoteOpen] = useState(false);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const salesReturns = usePaginated(useSalesReturns);
  const cancelSalesReturn = useCancelSalesReturn();
  const purchaseReturns = usePaginated(usePurchaseReturns);
  const cancelPurchaseReturn = useCancelPurchaseReturn();
  const creditNotes = usePaginated(useCreditNotes);
  const cancelCreditNote = useCancelCreditNote();
  const debitNotes = usePaginated(useDebitNotes);
  const cancelDebitNote = useCancelDebitNote();

  const addHandlers = {
    'Sales Returns': () => setSalesReturnOpen(true),
    'Purchase Returns': () => setPurchaseReturnOpen(true),
    'Credit Notes': () => setCreditNoteOpen(true),
    'Debit Notes': () => setDebitNoteOpen(true),
  };

  const cancelWithReason = (mutation, id) => {
    const reason = window.prompt('Cancellation reason:');
    if (reason) mutation.mutate({ id, reason });
  };

  return (
    <div className="space-y-6">

      

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

      {activeTab === 'Sales Returns' && (
        salesReturns.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'returnNumber', header: 'Return #' },
              { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
              { accessorKey: 'returnDate', header: 'Date' },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.totalAmountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelSalesReturn, row.original.id)}>Cancel</button></div>
                ),
              },
            ]}
            {...salesReturns.tableProps}
            searchPlaceholder="Search return no, reason…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          }
          />
        )
      )}

      {activeTab === 'Purchase Returns' && (
        purchaseReturns.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'returnNumber', header: 'Return #' },
              { id: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name },
              { accessorKey: 'returnDate', header: 'Date' },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.totalAmountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelPurchaseReturn, row.original.id)}>Cancel</button></div>
                ),
              },
            ]}
            {...purchaseReturns.tableProps}
            searchPlaceholder="Search return no, reason…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          }
          />
        )
      )}

      {activeTab === 'Credit Notes' && (
        creditNotes.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'noteNumber', header: 'Note #' },
              { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name },
              { accessorKey: 'noteDate', header: 'Date' },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelCreditNote, row.original.id)}>Cancel</button></div>
                ),
              },
            ]}
            {...creditNotes.tableProps}
            searchPlaceholder="Search note no, reason…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          }
          />
        )
      )}

      {activeTab === 'Debit Notes' && (
        debitNotes.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'noteNumber', header: 'Note #' },
              { id: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name },
              { accessorKey: 'noteDate', header: 'Date' },
              { accessorKey: 'reason', header: 'Reason' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => row.original.status === 'POSTED' && (
                  <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => cancelWithReason(cancelDebitNote, row.original.id)}>Cancel</button></div>
                ),
              },
            ]}
            {...debitNotes.tableProps}
            searchPlaceholder="Search note no, reason…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
          }
          />
        )
      )}

      <SalesReturnFormDialog open={salesReturnOpen} onOpenChange={setSalesReturnOpen} />
      <PurchaseReturnFormDialog open={purchaseReturnOpen} onOpenChange={setPurchaseReturnOpen} />
      <CreditNoteFormDialog open={creditNoteOpen} onOpenChange={setCreditNoteOpen} />
      <DebitNoteFormDialog open={debitNoteOpen} onOpenChange={setDebitNoteOpen} />
    </div>
  );
}

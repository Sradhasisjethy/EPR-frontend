import { useState } from 'react';
import { IndentFormDialog } from '@/components/purchasing/indent-form-dialog';
import { ConvertIndentDialog } from '@/components/purchasing/convert-indent-dialog';
import { ThreeWayMatchDialog } from '@/components/purchasing/three-way-match-dialog';
import { useIndents, useApproveIndent, useRejectIndent } from '@/hooks/use-indents';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import {
  usePurchaseOrders, useConfirmPurchaseOrder, useCancelPurchaseOrder,
  useGoodsReceipts, useCancelGoodsReceipt, usePurchaseInvoices, useCancelPurchaseInvoice,
} from '@/hooks/use-purchasing';
import { PurchaseOrderFormDialog } from '@/components/purchasing/purchase-order-form-dialog';
import { GoodsReceiptFormDialog } from '@/components/purchasing/goods-receipt-form-dialog';
import { PurchaseInvoiceFormDialog } from '@/components/purchasing/purchase-invoice-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Indents', 'Orders', 'Receipts', 'Invoices'];

// Each must match the allow-list the matching service passes to `toOrder`.
const SORTABLE = {
  orders: ['poNumber', 'orderDate', 'status', 'totalAmountPaise'],
  receipts: ['grnNumber', 'receiptDate', 'status'],
  invoices: ['vendorInvoiceNumber', 'invoiceDate', 'amountPaise', 'paymentStatus', 'status'],
};

const PAYMENT_LABEL = { UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid' };

export default function PurchasingPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Indents', 'subtab');
  const [indentDialogOpen, setIndentDialogOpen] = useState(false);
  const [convertingIndent, setConvertingIndent] = useState(null);
  const [matchingInvoice, setMatchingInvoice] = useState(null);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [grnDialogOpen, setGrnDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canCreate = hasPermission(user, 'PURCHASE_CREATE');
  const canModify = hasPermission(user, 'PURCHASE_MODIFY');
  const canApprove = hasPermission(user, 'PURCHASE_APPROVE');
  // Reversing a posted receipt or a booked payable is gated on DELETE, matching
  // the router — these unwind stock and the ledger, not just a draft.
  const canReverse = hasPermission(user, 'PURCHASE_DELETE');
  const [editingPo, setEditingPo] = useState(null);
  const [actionError, setActionError] = useState('');

  const indentQuery = usePaginated(useIndents);
  const approveIndent = useApproveIndent();
  const rejectIndent = useRejectIndent();
  const poQuery = usePaginated(usePurchaseOrders, {}, { sortableColumns: SORTABLE.orders });
  const grnQuery = usePaginated(useGoodsReceipts, {}, { sortableColumns: SORTABLE.receipts });
  const invoiceQuery = usePaginated(usePurchaseInvoices, {}, { sortableColumns: SORTABLE.invoices });
  const confirmPo = useConfirmPurchaseOrder();
  const cancelPo = useCancelPurchaseOrder();
  const cancelGrn = useCancelGoodsReceipt();
  const cancelInvoice = useCancelPurchaseInvoice();

  // Any of these can legitimately be refused — an over-receipt, a consumed lot,
  // an invoice that has been paid, a location the user may not touch. Without
  // this the row simply did not change and nothing said why.
  const run = (mutation, arg) => {
    setActionError('');
    mutation.mutate(arg, {
      onError: (err) => setActionError(err.response?.data?.message || 'That action could not be completed.'),
    });
  };

  const promptAndRun = (message, mutation, id) => {
    const reason = window.prompt(message);
    if (reason) run(mutation, { id, reason });
  };

  const addHandlers = {
    Indents: () => setIndentDialogOpen(true),
    Orders: () => { setEditingPo(null); setPoDialogOpen(true); },
    Receipts: () => setGrnDialogOpen(true),
    Invoices: () => setInvoiceDialogOpen(true),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Purchasing</h2>
        <p className="text-muted-foreground">Purchase orders, goods receipt, and vendor invoices (M12)</p>
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

      {actionError && (
        <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{actionError}</div>
      )}

      {activeTab === 'Indents' && (
        indentQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'indentNumber', header: 'Indent #' },
              { accessorKey: 'indentDate', header: 'Date' },
              { accessorKey: 'requiredByDate', header: 'Required By' },
              { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length ?? 0 },
              { accessorKey: 'remarks', header: 'Remarks' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase().replace(/_/g, ' ')} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-2">
                    {row.original.status === 'PENDING_APPROVAL' && canApprove && (
                      <>
                        <button className="text-xs text-primary hover:underline" onClick={() => run(approveIndent, row.original.id)}>Approve</button>
                        <button
                          className="text-xs text-destructive hover:underline"
                          onClick={() => promptAndRun('Rejection reason:', rejectIndent, row.original.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {row.original.status === 'APPROVED' && canCreate && (
                      <button className="text-xs text-primary hover:underline" onClick={() => setConvertingIndent(row.original)}>
                        Convert to PO
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            {...indentQuery.tableProps}
            searchPlaceholder="Search indent number…"
          actionsNode={canCreate && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
          />
        )
      )}

      {activeTab === 'Orders' && (
        poQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'poNumber', header: 'PO #' },
              { id: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name },
              { accessorKey: 'orderDate', header: 'Order Date' },
              ...(showRates ? [{ id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalAmountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-2">
                    {/* Only a DRAFT is editable — a confirmed order may already have goods against it. */}
                    {row.original.status === 'DRAFT' && canModify && (
                      <button
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Edit draft"
                        onClick={() => { setEditingPo(row.original); setPoDialogOpen(true); }}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {row.original.status === 'DRAFT' && canModify && (
                      <button className="text-xs text-primary hover:underline" onClick={() => run(confirmPo, row.original.id)}>Confirm</button>
                    )}
                    {!['RECEIVED', 'CANCELLED'].includes(row.original.status) && canModify && (
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => promptAndRun('Cancellation reason:', cancelPo, row.original.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            {...poQuery.tableProps}
            searchPlaceholder="Search PO number…"
          actionsNode={canCreate && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
          />
        )
      )}

      {activeTab === 'Receipts' && (
        grnQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'grnNumber', header: 'GRN #' },
              { id: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name },
              { id: 'po', header: 'Against PO', cell: ({ row }) => row.original.purchaseOrder?.poNumber || 'Direct' },
              { accessorKey: 'receiptDate', header: 'Receipt Date' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-2">
                    {row.original.status === 'POSTED' && canReverse && (
                      <button
                        className="text-xs text-destructive hover:underline"
                        title="Reverse this receipt and take its stock back out"
                        onClick={() =>
                          promptAndRun(
                            'Why is this receipt being reversed?\n\nIts stock will be taken back out. This is refused if the material has already been consumed or invoiced.',
                            cancelGrn,
                            row.original.id
                          )
                        }
                      >
                        Cancel &amp; reverse
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            {...grnQuery.tableProps}
            emptyMessage="No goods receipts yet. Receiving against a purchase order is what puts stock in."
          actionsNode={canCreate && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
            searchPlaceholder="Search GRN number…"
          />
        )
      )}

      {activeTab === 'Invoices' && (
        invoiceQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'vendorInvoiceNumber', header: 'Vendor Invoice #' },
              { id: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name },
              { accessorKey: 'invoiceDate', header: 'Date' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              {
                id: 'match', header: '',
                cell: ({ row }) => (
                  <button className="text-xs text-primary hover:underline" onClick={() => setMatchingInvoice(row.original)}>
                    3-way match
                  </button>
                ),
              },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={(row.original.status || 'POSTED').toLowerCase()} /> },
              {
                // Read-only: settlement is derived from allocations, so this
                // follows the payments that were actually recorded. It used to
                // be a dropdown that wrote the field directly, which let a bill
                // be marked Paid with no money behind it.
                id: 'paymentStatus', header: 'Payment',
                cell: ({ row }) => (
                  <span title="Derived from recorded payments — record a payment to change it">
                    <StatusBadge status={(row.original.paymentStatus || 'UNPAID').toLowerCase().replace(/_/g, ' ')} />
                    <span className="sr-only">{PAYMENT_LABEL[row.original.paymentStatus]}</span>
                  </span>
                ),
              },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-2">
                    {row.original.status !== 'CANCELLED' && canReverse && (
                      <button
                        className="text-xs text-destructive hover:underline"
                        title="Reverse this bill and its payable"
                        onClick={() =>
                          promptAndRun(
                            'Why is this vendor bill being cancelled?\n\nIts payable will be reversed. This is refused if any payment has been made against it.',
                            cancelInvoice,
                            row.original.id
                          )
                        }
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            {...invoiceQuery.tableProps}
            emptyMessage="No vendor bills yet. Raise one against a goods receipt to book the payable."
          actionsNode={canCreate && (
          <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
        )}
            searchPlaceholder="Search vendor invoice…"
          />
        )
      )}

      <IndentFormDialog open={indentDialogOpen} onOpenChange={setIndentDialogOpen} />
      <ConvertIndentDialog open={!!convertingIndent} onOpenChange={(v) => !v && setConvertingIndent(null)} indent={convertingIndent} />
      <ThreeWayMatchDialog open={!!matchingInvoice} onOpenChange={(v) => !v && setMatchingInvoice(null)} invoice={matchingInvoice} />
      <PurchaseOrderFormDialog open={poDialogOpen} onOpenChange={setPoDialogOpen} order={editingPo} />
      <GoodsReceiptFormDialog open={grnDialogOpen} onOpenChange={setGrnDialogOpen} />
      <PurchaseInvoiceFormDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
    </div>
  );
}

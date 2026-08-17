import { useState } from 'react';
import { IndentFormDialog } from '@/components/purchasing/indent-form-dialog';
import { ConvertIndentDialog } from '@/components/purchasing/convert-indent-dialog';
import { ThreeWayMatchDialog } from '@/components/purchasing/three-way-match-dialog';
import { useIndents, useApproveIndent, useRejectIndent } from '@/hooks/use-indents';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { usePurchaseOrders, useConfirmPurchaseOrder, useCancelPurchaseOrder, useGoodsReceipts, usePurchaseInvoices, useUpdatePaymentStatus } from '@/hooks/use-purchasing';
import { PurchaseOrderFormDialog } from '@/components/purchasing/purchase-order-form-dialog';
import { GoodsReceiptFormDialog } from '@/components/purchasing/goods-receipt-form-dialog';
import { PurchaseInvoiceFormDialog } from '@/components/purchasing/purchase-invoice-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Indents', 'Orders', 'Receipts', 'Invoices'];

export default function PurchasingPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Indents');
  const [indentDialogOpen, setIndentDialogOpen] = useState(false);
  const [convertingIndent, setConvertingIndent] = useState(null);
  const [matchingInvoice, setMatchingInvoice] = useState(null);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [grnDialogOpen, setGrnDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const indentQuery = usePaginated(useIndents);
  const approveIndent = useApproveIndent();
  const rejectIndent = useRejectIndent();
  const poQuery = usePaginated(usePurchaseOrders);
  const grnQuery = usePaginated(useGoodsReceipts);
  const invoiceQuery = usePaginated(usePurchaseInvoices);
  const confirmPo = useConfirmPurchaseOrder();
  const cancelPo = useCancelPurchaseOrder();
  const updatePaymentStatus = useUpdatePaymentStatus();

  const addHandlers = {
    Indents: () => setIndentDialogOpen(true),
    Orders: () => setPoDialogOpen(true),
    Receipts: () => setGrnDialogOpen(true),
    Invoices: () => setInvoiceDialogOpen(true),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchasing</h2>
          <p className="text-muted-foreground">Purchase orders, goods receipt, and vendor invoices (M12)</p>
        </div>
        <Button onClick={addHandlers[activeTab]}><Plus size={16} /> New {activeTab.replace(/s$/, '')}</Button>
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
                    {row.original.status === 'PENDING_APPROVAL' && (
                      <>
                        <button className="text-xs text-primary hover:underline" onClick={() => approveIndent.mutate(row.original.id)}>Approve</button>
                        <button
                          className="text-xs text-destructive hover:underline"
                          onClick={() => {
                            const reason = window.prompt('Rejection reason:');
                            if (reason) rejectIndent.mutate({ id: row.original.id, reason });
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {row.original.status === 'APPROVED' && (
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
                    {row.original.status === 'DRAFT' && (
                      <button className="text-xs text-primary hover:underline" onClick={() => confirmPo.mutate(row.original.id)}>Confirm</button>
                    )}
                    {!['RECEIVED', 'CANCELLED'].includes(row.original.status) && (
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => {
                          const reason = window.prompt('Cancellation reason:');
                          if (reason) cancelPo.mutate({ id: row.original.id, reason });
                        }}
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
            ]}
            {...grnQuery.tableProps}
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
              {
                id: 'paymentStatus', header: 'Payment',
                cell: ({ row }) => (
                  <select
                    value={row.original.paymentStatus}
                    onChange={(e) => updatePaymentStatus.mutate({ id: row.original.id, paymentStatus: e.target.value })}
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                    <option value="PAID">Paid</option>
                  </select>
                ),
              },
            ]}
            {...invoiceQuery.tableProps}
            searchPlaceholder="Search vendor invoice…"
          />
        )
      )}

      <IndentFormDialog open={indentDialogOpen} onOpenChange={setIndentDialogOpen} />
      <ConvertIndentDialog open={!!convertingIndent} onOpenChange={(v) => !v && setConvertingIndent(null)} indent={convertingIndent} />
      <ThreeWayMatchDialog open={!!matchingInvoice} onOpenChange={(v) => !v && setMatchingInvoice(null)} invoice={matchingInvoice} />
      <PurchaseOrderFormDialog open={poDialogOpen} onOpenChange={setPoDialogOpen} />
      <GoodsReceiptFormDialog open={grnDialogOpen} onOpenChange={setGrnDialogOpen} />
      <PurchaseInvoiceFormDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
    </div>
  );
}

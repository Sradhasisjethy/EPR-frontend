import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, CheckCircle2, Printer } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProductionPlans, useProductionEntries, usePendingApprovals, useApproveVariance, useWastageRecords, useProductionOrders, useMaterialConsumptions, productionSheetUrl } from '@/hooks/use-production';
import { GeneratePlanDialog } from '@/components/production/generate-plan-dialog';
import { ConfirmPlanDialog } from '@/components/production/confirm-plan-dialog';
import { ProductionEntryFormDialog } from '@/components/production/production-entry-form-dialog';
import { WastageFormDialog } from '@/components/production/wastage-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Plans', 'Orders', 'Entries', 'Consumption', 'Approvals', 'Wastage'];

const FULFILMENT_BADGE = {
  NOT_STARTED: 'pending',
  IN_PROGRESS: 'onboarding',
  COMPLETE: 'active',
};

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Plans', 'subtab');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [wastageDialogOpen, setWastageDialogOpen] = useState(false);

  const planQuery = usePaginated(useProductionPlans);
  const entryQuery = usePaginated(useProductionEntries);
  const approvalQuery = usePaginated(usePendingApprovals);
  const wastageQuery = usePaginated(useWastageRecords);
  const orderQuery = usePaginated(useProductionOrders);
  const consumptionQuery = usePaginated(useMaterialConsumptions);
  const approveVariance = useApproveVariance();

  const addHandlers = {
    Plans: () => setGenerateOpen(true),
    Orders: null,
    Entries: () => setEntryDialogOpen(true),
    Consumption: null,
    Approvals: null,
    Wastage: () => setWastageDialogOpen(true),
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
            {tab === 'Approvals' && approvalQuery.query.data?.count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-4 min-w-4 px-1">
                {approvalQuery.query.data.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Plans' && (
        planQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'planDate', header: 'Plan Date' },
              { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length ?? 0 },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'CONFIRMED' ? 'active' : 'pending'} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) =>
                  row.original.status === 'PROPOSED' ? (
                    <button className="text-xs text-primary hover:underline" onClick={() => setConfirmingPlan(row.original)}>Review & Confirm</button>
                  ) : (
                    // The shop-floor job card. Opened in a new tab rather than
                    // fetched, so the browser's own PDF viewer handles it.
                    <a
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      href={productionSheetUrl(row.original.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Printer size={13} /> Production sheet
                    </a>
                  ),
              },
            ]}
            {...planQuery.tableProps}
            searchPlaceholder="Search plan number…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}>
            <Plus size={16} /> {activeTab === 'Plans' ? 'Generate Proposal' : activeTab === 'Entries' ? 'New Entry' : 'Record Wastage'}
          </Button>
        )}
          />
        )
      )}

      {activeTab === 'Entries' && (
        entryQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'entryNumber', header: 'Entry #' },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name },
              { accessorKey: 'productionDate', header: 'Date' },
              { accessorKey: 'goodQty', header: 'Good Qty' },
              { accessorKey: 'rejectedQty', header: 'Rejected Qty' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'POSTED' ? 'active' : 'terminated'} /> },
            ]}
            {...entryQuery.tableProps}
            searchPlaceholder="Search entry number…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}>
            <Plus size={16} /> {activeTab === 'Plans' ? 'Generate Proposal' : activeTab === 'Entries' ? 'New Entry' : 'Record Wastage'}
          </Button>
        )}
          />
        )
      )}

      {activeTab === 'Orders' && (
        orderQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { id: 'plan', header: 'Plan #', cell: ({ row }) => row.original.productionPlan?.planNumber || '—' },
              { id: 'planDate', header: 'Plan Date', cell: ({ row }) => row.original.productionPlan?.planDate },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name },
              { accessorKey: 'targetQty', header: 'To Make' },
              { accessorKey: 'producedQty', header: 'Made' },
              { accessorKey: 'remainingQty', header: 'Remaining' },
              {
                id: 'fulfilment', header: 'Progress',
                cell: ({ row }) => <StatusBadge status={FULFILMENT_BADGE[row.original.fulfilmentStatus] || 'pending'} />,
              },
              {
                id: 'actions', header: '',
                cell: ({ row }) =>
                  row.original.remainingQty > 0 ? (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setEntryDialogOpen(true)}
                      title={`Record production against ${row.original.product?.name || 'this order'}`}
                    >
                      Record production
                    </button>
                  ) : null,
              },
            ]}
            {...orderQuery.tableProps}
            searchPlaceholder="Search plan number…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}>
            <Plus size={16} /> {activeTab === 'Plans' ? 'Generate Proposal' : activeTab === 'Entries' ? 'New Entry' : 'Record Wastage'}
          </Button>
        )}
            emptyMessage="No confirmed production orders. Generate a plan and confirm it to create work for the floor."
          />
        )
      )}

      {activeTab === 'Consumption' && (
        consumptionQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { id: 'entry', header: 'Entry #', cell: ({ row }) => row.original.productionEntry?.entryNumber },
              { id: 'date', header: 'Date', cell: ({ row }) => row.original.productionEntry?.productionDate },
              { id: 'product', header: 'Made', cell: ({ row }) => row.original.productionEntry?.product?.name },
              { id: 'material', header: 'Raw Material', cell: ({ row }) => row.original.rawMaterial?.name },
              { accessorKey: 'mixDesignQty', header: 'Per Recipe' },
              { accessorKey: 'actualQty', header: 'Actually Used' },
              {
                id: 'variance', header: 'Variance',
                cell: ({ row }) => {
                  const pct = Number(row.original.variancePercent || 0);
                  if (pct === 0) return <span className="text-muted-foreground text-xs">—</span>;
                  return (
                    <span className={row.original.requiresApproval ? 'text-destructive text-xs font-medium' : 'text-amber-600 dark:text-amber-400 text-xs'}>
                      {pct}%{row.original.requiresApproval && !row.original.approvedBy ? ' · needs sign-off' : ''}
                    </span>
                  );
                },
              },
              { accessorKey: 'varianceReason', header: 'Reason' },
            ]}
            {...consumptionQuery.tableProps}
            searchPlaceholder="Search entry number…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}>
            <Plus size={16} /> {activeTab === 'Plans' ? 'Generate Proposal' : activeTab === 'Entries' ? 'New Entry' : 'Record Wastage'}
          </Button>
        )}
            emptyMessage="No material has been consumed yet."
          />
        )
      )}

      {activeTab === 'Approvals' && (
        approvalQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { id: 'entry', header: 'Entry #', cell: ({ row }) => row.original.productionEntry?.entryNumber },
              { id: 'product', header: 'Finished Good', cell: ({ row }) => row.original.productionEntry?.product?.name },
              { id: 'material', header: 'Raw Material', cell: ({ row }) => row.original.rawMaterial?.name },
              { accessorKey: 'mixDesignQty', header: 'Expected' },
              { accessorKey: 'actualQty', header: 'Actual' },
              { id: 'variance', header: 'Variance %', cell: ({ row }) => `${row.original.variancePercent}%` },
              { accessorKey: 'varianceReason', header: 'Reason' },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <button
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                    onClick={() => approveVariance.mutate(row.original.id)}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                ),
              },
            ]}
            {...approvalQuery.tableProps}
            searchPlaceholder="Search entry number…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}>
            <Plus size={16} /> {activeTab === 'Plans' ? 'Generate Proposal' : activeTab === 'Entries' ? 'New Entry' : 'Record Wastage'}
          </Button>
        )}
          />
        )
      )}

      {activeTab === 'Wastage' && (
        wastageQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'recordedDate', header: 'Date' },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name },
              { id: 'lot', header: 'Lot', cell: ({ row }) => row.original.lot?.lotNumber || 'N/A' },
              { accessorKey: 'stage', header: 'Stage' },
              { accessorKey: 'quantity', header: 'Qty' },
              { accessorKey: 'reason', header: 'Reason' },
            ]}
            {...wastageQuery.tableProps}
            searchPlaceholder="Search wastage…"
          actionsNode={addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}>
            <Plus size={16} /> {activeTab === 'Plans' ? 'Generate Proposal' : activeTab === 'Entries' ? 'New Entry' : 'Record Wastage'}
          </Button>
        )}
          />
        )
      )}

      <GeneratePlanDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <ConfirmPlanDialog open={!!confirmingPlan} onOpenChange={(open) => !open && setConfirmingPlan(null)} plan={confirmingPlan} />
      <ProductionEntryFormDialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen} />
      <WastageFormDialog open={wastageDialogOpen} onOpenChange={setWastageDialogOpen} />
    </div>
  );
}

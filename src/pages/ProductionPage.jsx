import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, CheckCircle2, Printer } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProductionPlans, useProductionEntries, usePendingApprovals, useApproveVariance, useWastageRecords, useProductionOrders, useMaterialConsumptions, openProductionSheet } from '@/hooks/use-production';
import { GeneratePlanDialog } from '@/components/production/generate-plan-dialog';
import { ConfirmPlanDialog } from '@/components/production/confirm-plan-dialog';
import { ProductionEntryFormDialog } from '@/components/production/production-entry-form-dialog';
import { WastageFormDialog } from '@/components/production/wastage-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';
import { useUIStore } from '@/store/ui-store';
import { toast } from 'sonner';
import { DateText } from '@/components/date-text';
import { usePermissions } from '@/hooks/use-permissions';
import { WebPermissions } from '@/constants/enums';

const TABS = ['Plans', 'Orders', 'Entries', 'Consumption', 'Approvals', 'Wastage'];

/**
 * Signing off a material variance is deliberately a separate grant from
 * recording one (BR-09): the role that does the work does not get to approve
 * its own. The grant existed in the catalog and on the API route, but nothing
 * on the client had ever asked for it — the Approvals tab and its Approve
 * button rendered for anyone who could open the page.
 */
const APPROVALS_TAB = 'Approvals';

const FULFILMENT_BADGE = {
  NOT_STARTED: 'pending',
  IN_PROGRESS: 'onboarding',
  COMPLETE: 'active',
};

export default function ProductionPage() {
  const { glassMode } = useUIStore();
  const { hasPermission } = usePermissions();
  const canRecordProduction = hasPermission(WebPermissions.PRODUCTION_CREATE);
  const canRecordWastage = hasPermission(WebPermissions.WASTAGE_CREATE);
  const canApproveVariance = hasPermission(WebPermissions.PRODUCTION_APPROVE_VARIANCE);
  // Drop the tab itself, not just the button — otherwise the queue of pending
  // approvals is still readable by anyone who may open Production.
  const tabs = canApproveVariance ? TABS : TABS.filter((tab) => tab !== APPROVALS_TAB);
  const [activeTab, setActiveTab] = useTabParam(tabs, 'Plans', 'subtab');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  // The order row a casting run is being recorded against, if any. Without it
  // the entry is standalone: stock moves, but the order's produced/remaining
  // figures never budge, because progress is summed over entries carrying the
  // plan line's id.
  const [entryForOrder, setEntryForOrder] = useState(null);
  const [wastageDialogOpen, setWastageDialogOpen] = useState(false);

  const planQuery = usePaginated(useProductionPlans);
  const entryQuery = usePaginated(useProductionEntries);
  const approvalQuery = usePaginated(usePendingApprovals);
  const wastageQuery = usePaginated(useWastageRecords);
  const orderQuery = usePaginated(useProductionOrders);
  const consumptionQuery = usePaginated(useMaterialConsumptions);
  const approveVariance = useApproveVariance();

  // Recording a casting run and recording wastage are separate resources in
  // the catalog; the null entries are tabs that never had an add action.
  const addHandlers = {
    Plans: canRecordProduction ? () => setGenerateOpen(true) : null,
    Orders: null,
    Entries: canRecordProduction ? () => setEntryDialogOpen(true) : null,
    Consumption: null,
    Approvals: null,
    Wastage: canRecordWastage ? () => setWastageDialogOpen(true) : null,
  };

  return (
    <div className="space-y-6">
      

      {glassMode ? (
        <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto shadow-xs mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-foreground/75 hover:text-foreground hover:bg-card/70'
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'Approvals' && approvalQuery.query.data?.count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-4 min-w-4 px-1">
                  {approvalQuery.query.data.count}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex border-b border-border mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer', activeTab === tab ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground')}
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
      )}

      {activeTab === 'Plans' && (
        planQuery.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { id: 'planDate', header: 'Plan Date', cell: ({ row }) => <DateText value={row.original.planDate} /> },
              {
                id: 'lines',
                header: 'Lines',
                cell: ({ row }) => {
                  const count = row.original.lines?.length ?? 0;
                  return count === 0 ? (
                    <span className="text-xs text-muted-foreground">0 (No shortfall)</span>
                  ) : (
                    <span className="text-xs font-medium text-foreground">{count} {count === 1 ? 'item' : 'items'}</span>
                  );
                },
              },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'CONFIRMED' ? 'active' : 'pending'} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) =>
                  row.original.status === 'PROPOSED' ? (
                    <button className="text-xs text-primary hover:underline" onClick={() => setConfirmingPlan(row.original)}>Review & Confirm</button>
                  ) : (
                    // The shop-floor job card. Fetched rather than linked: the
                    // API is on another origin, and a link navigation carries
                    // no cookie, so a plain href arrived unauthenticated.
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={() =>
                        openProductionSheet(row.original.id).catch((err) =>
                          toast.error(err.response?.data?.message || 'Could not open the production sheet.')
                        )
                      }
                    >
                      <Printer size={13} /> Production sheet
                    </button>
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
              { id: 'productionDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.productionDate} /> },
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
                      onClick={() => { setEntryForOrder(row.original); setEntryDialogOpen(true); }}
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
                  canApproveVariance && (
                    <button
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                      onClick={() => approveVariance.mutate(row.original.id)}
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                  )
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
              { id: 'recordedDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.recordedDate} /> },
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
      <ProductionEntryFormDialog
        open={entryDialogOpen}
        onOpenChange={(open) => { setEntryDialogOpen(open); if (!open) setEntryForOrder(null); }}
        defaultFactoryId={entryForOrder?.productionPlan?.factoryId}
        defaultProductId={entryForOrder?.productId}
        defaultPlanLineId={entryForOrder?.id}
      />
      <WastageFormDialog open={wastageDialogOpen} onOpenChange={setWastageDialogOpen} />
    </div>
  );
}

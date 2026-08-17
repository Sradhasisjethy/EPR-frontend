import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, CheckCircle2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProductionPlans, useProductionEntries, usePendingApprovals, useApproveVariance, useWastageRecords } from '@/hooks/use-production';
import { GeneratePlanDialog } from '@/components/production/generate-plan-dialog';
import { ConfirmPlanDialog } from '@/components/production/confirm-plan-dialog';
import { ProductionEntryFormDialog } from '@/components/production/production-entry-form-dialog';
import { WastageFormDialog } from '@/components/production/wastage-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Plans', 'Entries', 'Approvals', 'Wastage'];

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Plans');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [wastageDialogOpen, setWastageDialogOpen] = useState(false);

  const planQuery = usePaginated(useProductionPlans);
  const entryQuery = usePaginated(useProductionEntries);
  const approvalQuery = usePaginated(usePendingApprovals);
  const wastageQuery = usePaginated(useWastageRecords);
  const approveVariance = useApproveVariance();

  const addHandlers = {
    Plans: () => setGenerateOpen(true),
    Entries: () => setEntryDialogOpen(true),
    Approvals: null,
    Wastage: () => setWastageDialogOpen(true),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production</h2>
          <p className="text-muted-foreground">Planning, casting entry, material consumption and wastage (M08-M11)</p>
        </div>
        {addHandlers[activeTab] && (
          <Button onClick={addHandlers[activeTab]}>
            <Plus size={16} /> {activeTab === 'Plans' ? 'Generate Proposal' : activeTab === 'Entries' ? 'New Entry' : 'Record Wastage'}
          </Button>
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
                  ) : null,
              },
            ]}
            {...planQuery.tableProps}
            searchPlaceholder="Search plan number…"
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

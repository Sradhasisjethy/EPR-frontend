import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreHorizontal,
  Calendar,
  Lock,
  Unlock,
  Zap,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useFactories,
  useDeleteFactory,
  useFinancialYears,
  useUpdateFinancialYearStatus,
  useDeleteFinancialYear,
} from '@/hooks/use-factory';
import { FactoryFormDialog } from '@/components/factory/factory-form-dialog';
import { FinancialYearFormDialog } from '@/components/factory/financial-year-form-dialog';
import { FinancialYearPeriodsDialog } from '@/components/factory/financial-year-periods-dialog';
import { FinancialYearCloseWizardDialog } from '@/components/factory/financial-year-close-wizard-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

function FactoryRowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
          <Pencil size={16} />
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function FinancialYearStatusBadge({ status, isCurrent }) {
  const currentStatus = status || (isCurrent ? 'ACTIVE' : 'PLANNED');

  switch (currentStatus) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          <CheckCircle2 size={13} /> Open / Active
        </span>
      );
    case 'SOFT_CLOSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
          <Clock size={13} /> Closing in Progress
        </span>
      );
    case 'CLOSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold border border-border">
          <Lock size={13} /> Closed / Audited
        </span>
      );
    case 'PLANNED':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold border border-purple-500/20">
          <Calendar size={13} /> Draft / Planned
        </span>
      );
  }
}

function FinancialYearRowActions({
  fy,
  onEdit,
  onViewPeriods,
  onOpenCloseWizard,
  onTogglePostings,
  onDelete,
}) {
  const status = fy.status || (fy.isCurrent ? 'ACTIVE' : 'PLANNED');
  const isClosed = status === 'CLOSED';
  const isPlanned = status === 'PLANNED';
  const isActive = status === 'ACTIVE';
  const isSoftClosed = status === 'SOFT_CLOSED';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onViewPeriods} className="gap-2 cursor-pointer">
          <Calendar size={15} className="text-primary" />
          <span>View Periods (Months 1–12)</span>
        </DropdownMenuItem>

        {!isClosed && (
          <DropdownMenuItem onClick={onOpenCloseWizard} className="gap-2 cursor-pointer">
            <Zap size={15} className="text-amber-500" />
            <span>Year-End Close Wizard</span>
          </DropdownMenuItem>
        )}

        {isActive && (
          <DropdownMenuItem onClick={() => onTogglePostings('SOFT_CLOSED')} className="gap-2 cursor-pointer">
            <Lock size={15} className="text-amber-600" />
            <span>Lock Operational Postings</span>
          </DropdownMenuItem>
        )}

        {isSoftClosed && (
          <DropdownMenuItem onClick={() => onTogglePostings('ACTIVE')} className="gap-2 cursor-pointer text-emerald-600">
            <Unlock size={15} />
            <span>Reopen Postings (Active)</span>
          </DropdownMenuItem>
        )}

        {isPlanned && (
          <DropdownMenuItem onClick={() => onTogglePostings('ACTIVE')} className="gap-2 cursor-pointer text-emerald-600">
            <CheckCircle2 size={15} />
            <span>Activate Financial Year</span>
          </DropdownMenuItem>
        )}

        {!isClosed && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
              <Pencil size={15} className="text-muted-foreground" />
              <span>Edit Details</span>
            </DropdownMenuItem>
          </>
        )}

        {/* Safe Deletion: Strictly hidden once transactions touch or year is active/closed */}
        {isPlanned && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 size={15} />
              <span>Delete Financial Year</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function FactoriesPage() {
  const [activeTab, setActiveTab] = useTabParam(['factories', 'financial-years'], 'factories', 'subtab');
  const [factoryDialogOpen, setFactoryDialogOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState(null);

  // Financial Year States
  const [fyDialogOpen, setFyDialogOpen] = useState(false);
  const [editingFy, setEditingFy] = useState(null);
  const [selectedPeriodsFy, setSelectedPeriodsFy] = useState(null);
  const [periodsDialogOpen, setPeriodsDialogOpen] = useState(false);
  const [selectedCloseFy, setSelectedCloseFy] = useState(null);
  const [closeWizardOpen, setCloseWizardOpen] = useState(false);

  // Confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [factoryToDelete, setFactoryToDelete] = useState(null);
  const [deleteFyConfirmOpen, setDeleteFyConfirmOpen] = useState(false);
  const [fyToDelete, setFyToDelete] = useState(null);

  const { query, tableProps } = usePaginated(useFactories);
  const { isLoading: factoryLoading, isError: factoryError } = query;
  const { data: fyData, isLoading: fyLoading } = useFinancialYears({ page: 1, limit: 20 });
  const deleteFactory = useDeleteFactory();
  const deleteFy = useDeleteFinancialYear();
  const updateFyStatus = useUpdateFinancialYearStatus();

  const handleDeleteClick = (factory) => {
    setFactoryToDelete(factory);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (factoryToDelete) {
      deleteFactory.mutate(factoryToDelete.id);
      setFactoryToDelete(null);
    }
  };

  const handleConfirmDeleteFy = () => {
    if (fyToDelete) {
      deleteFy.mutate(fyToDelete.id);
      setFyToDelete(null);
    }
  };

  const handleTogglePostings = (fy, targetStatus) => {
    updateFyStatus.mutate({ id: fy.id, status: targetStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-border mb-6">
        {['Factories', 'Financial Years'].map((tab) => {
          const key = tab.toLowerCase().replace(' ', '-');
          return (
            <button
              key={tab}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab(key)}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {activeTab === 'factories' && (
        factoryLoading ? (
          <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
        ) : factoryError ? (
          <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load factories.</div>
        ) : (
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'code', header: 'Code' },
              { accessorKey: 'city', header: 'City', cell: ({ row }) => row.original.city || 'N/A' },
              { accessorKey: 'state', header: 'State', cell: ({ row }) => row.original.state || 'N/A' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                  <FactoryRowActions
                    onEdit={() => { setEditingFactory(row.original); setFactoryDialogOpen(true); }}
                    onDelete={() => handleDeleteClick(row.original)}
                  />
                ),
              },
            ]}
            {...tableProps}
            searchPlaceholder="Search factory…"
            actionsNode={
              <Button onClick={() => { setEditingFactory(null); setFactoryDialogOpen(true); }}>
                <Plus size={16} className="mr-1.5" />
                Add Factory
              </Button>
            }
          />
        )
      )}

      {activeTab === 'financial-years' && (
        fyLoading ? (
          <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
        ) : (
          <DataTable
            columns={[
              {
                accessorKey: 'code',
                header: 'Financial Year',
                cell: ({ row }) => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{row.original.code}</span>
                  </div>
                ),
              },
              {
                accessorKey: 'startDate',
                header: 'Start Date',
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.startDate}</span>,
              },
              {
                accessorKey: 'endDate',
                header: 'End Date (12 Mos)',
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.endDate}</span>,
              },
              {
                id: 'status',
                header: 'Lifecycle State',
                cell: ({ row }) => (
                  <FinancialYearStatusBadge
                    status={row.original.status}
                    isCurrent={row.original.isCurrent}
                  />
                ),
              },
              {
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end">
                    <FinancialYearRowActions
                      fy={row.original}
                      onEdit={() => {
                        setEditingFy(row.original);
                        setFyDialogOpen(true);
                      }}
                      onViewPeriods={() => {
                        setSelectedPeriodsFy(row.original);
                        setPeriodsDialogOpen(true);
                      }}
                      onOpenCloseWizard={() => {
                        setSelectedCloseFy(row.original);
                        setCloseWizardOpen(true);
                      }}
                      onTogglePostings={(targetStatus) => handleTogglePostings(row.original, targetStatus)}
                      onDelete={() => {
                        setFyToDelete(row.original);
                        setDeleteFyConfirmOpen(true);
                      }}
                    />
                  </div>
                ),
              },
            ]}
            data={fyData?.rows || []}
            actionsNode={
              <Button onClick={() => { setEditingFy(null); setFyDialogOpen(true); }}>
                <Plus size={16} className="mr-1.5" />
                Add Financial Year
              </Button>
            }
          />
        )
      )}

      <FactoryFormDialog open={factoryDialogOpen} onOpenChange={setFactoryDialogOpen} factory={editingFactory} />
      <FinancialYearFormDialog open={fyDialogOpen} onOpenChange={setFyDialogOpen} financialYear={editingFy} />

      <FinancialYearPeriodsDialog
        open={periodsDialogOpen}
        onOpenChange={setPeriodsDialogOpen}
        financialYearId={selectedPeriodsFy?.id}
        financialYearCode={selectedPeriodsFy?.code}
      />

      <FinancialYearCloseWizardDialog
        open={closeWizardOpen}
        onOpenChange={setCloseWizardOpen}
        financialYear={selectedCloseFy}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Factory"
        description={`Delete factory "${factoryToDelete?.name}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteFyConfirmOpen}
        onOpenChange={setDeleteFyConfirmOpen}
        title="Delete Financial Year"
        description={`Delete financial year "${fyToDelete?.code}"? This cannot be undone.`}
        onConfirm={handleConfirmDeleteFy}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

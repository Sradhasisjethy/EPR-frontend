import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFactories, useDeleteFactory, useFinancialYears, useSetCurrentFinancialYear } from '@/hooks/use-factory';
import { FactoryFormDialog } from '@/components/factory/factory-form-dialog';
import { FinancialYearFormDialog } from '@/components/factory/financial-year-form-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
        <Pencil size={16} />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function FactoriesPage() {
  const [activeTab, setActiveTab] = useTabParam(['factories', 'financial-years'], 'factories');
  const [factoryDialogOpen, setFactoryDialogOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState(null);
  const [fyDialogOpen, setFyDialogOpen] = useState(false);

  const { query, tableProps } = usePaginated(useFactories);
  const { isLoading: factoryLoading, isError: factoryError } = query;
  const { data: fyData, isLoading: fyLoading } = useFinancialYears({ page: 1, limit: 20 });
  const deleteFactory = useDeleteFactory();
  const setCurrentFy = useSetCurrentFinancialYear();

  const handleDelete = (factory) => {
    if (window.confirm(`Delete factory "${factory.name}"? This cannot be undone.`)) {
      deleteFactory.mutate(factory.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Factories</h2>
          <p className="text-muted-foreground">Manage plant locations and financial years (M01)</p>
        </div>
        <Button onClick={() => (activeTab === 'factories' ? (setEditingFactory(null), setFactoryDialogOpen(true)) : setFyDialogOpen(true))}>
          <Plus size={16} />
          Add {activeTab === 'factories' ? 'Factory' : 'Financial Year'}
        </Button>
      </div>

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
                  <RowActions
                    onEdit={() => { setEditingFactory(row.original); setFactoryDialogOpen(true); }}
                    onDelete={() => handleDelete(row.original)}
                  />
                ),
              },
            ]}
            {...tableProps}
            searchPlaceholder="Search factory…"
          />
        )
      )}

      {activeTab === 'financial-years' && (
        fyLoading ? (
          <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
        ) : (
          <DataTable
            columns={[
              { accessorKey: 'code', header: 'Code' },
              { accessorKey: 'startDate', header: 'Start Date' },
              { accessorKey: 'endDate', header: 'End Date' },
              {
                id: 'current',
                header: 'Current',
                cell: ({ row }) =>
                  row.original.isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 size={14} /> Current
                    </span>
                  ) : (
                    <button
                      className="text-sm text-primary hover:underline"
                      onClick={() => setCurrentFy.mutate(row.original.id)}
                    >
                      Set as current
                    </button>
                  ),
              },
            ]}
            data={fyData?.rows || []}
          />
        )
      )}

      <FactoryFormDialog open={factoryDialogOpen} onOpenChange={setFactoryDialogOpen} factory={editingFactory} />
      <FinancialYearFormDialog open={fyDialogOpen} onOpenChange={setFyDialogOpen} />
    </div>
  );
}

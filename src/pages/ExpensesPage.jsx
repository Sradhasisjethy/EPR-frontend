import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { useHotkey } from '@/hooks/use-hotkey';
import { usePaginated } from '@/hooks/use-paginated';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useExpenses, useCancelExpense } from '@/hooks/use-expenses';
import { ExpenseFormDialog } from '@/components/expenses/expense-form-dialog';

export default function ExpensesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useExpenses);
  const { isLoading, isError } = query;
  const cancelExpense = useCancelExpense();

  useHotkey('n', useCallback(() => setDialogOpen(true), []));

  const handleCancel = (expense) => {
    const reason = window.prompt('Cancellation reason:');
    if (reason) cancelExpense.mutate({ id: expense.id, reason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Factory-level operating expenses (fuel, repairs, site supplies) — M28</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> New Expense <KeyHint>N</KeyHint>
        </Button>
      </div>

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load expenses.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'expenseNumber', header: 'Expense #' },
            { accessorKey: 'category', header: 'Category' },
            { accessorKey: 'expenseDate', header: 'Date' },
            { accessorKey: 'mode', header: 'Mode' },
            { id: 'paidTo', header: 'Paid To', cell: ({ row }) => row.original.paidToParty?.name || '—' },
            ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => row.original.status === 'POSTED' && (
                <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => handleCancel(row.original)}>Cancel</button></div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search expense no, category, description…"
        />
      )}

      <ExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

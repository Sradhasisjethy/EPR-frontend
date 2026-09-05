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
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancellingExpense, setCancellingExpense] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useExpenses);
  const { isLoading, isError } = query;
  const cancelExpense = useCancelExpense();

  useHotkey('n', useCallback(() => setDialogOpen(true), []));

  const handleCancel = (expense) => {
    setCancellingExpense(expense);
  };

  return (
    <div className="space-y-6">
      

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
          actionsNode={
            <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> New Expense <KeyHint>N</KeyHint>
        </Button>
          }
        />
      )}

      <ExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ReasonDialog
        open={!!cancellingExpense}
        onOpenChange={(open) => !open && setCancellingExpense(null)}
        title={`Cancel Expense — ${cancellingExpense?.expenseNumber}`}
        description="Are you sure you want to cancel this expense? This action will reverse posted general ledger entries and mark the expense as cancelled."
        label="Cancellation Reason"
        placeholder="e.g. Duplicate expense, wrong account selected, bill cancelled..."
        confirmText="Cancel Expense"
        variant="destructive"
        onConfirm={async (reason) => {
          if (!cancellingExpense) return;
          try {
            await cancelExpense.mutateAsync({ id: cancellingExpense.id, reason });
            toast.success('Expense cancelled successfully');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel expense.');
            throw err;
          }
        }}
      />
    </div>
  );
}

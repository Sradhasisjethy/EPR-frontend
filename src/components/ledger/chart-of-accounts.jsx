import { useState } from 'react';
import { MasterImportExportActions } from '@/components/master-data/import-export-actions';
import { Landmark, Plus, Wallet } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { useAccounts, useUpdateAccount } from '@/hooks/use-ledger';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { AccountFormDialog } from './account-form-dialog';
import { toast } from 'sonner';

const TYPE_LABEL = { ASSET: 'Asset', LIABILITY: 'Liability', EQUITY: 'Capital', INCOME: 'Income', EXPENSE: 'Expense' };

export function ChartOfAccounts() {
  const [showInactive, setShowInactive] = useState(false);
  const [dialog, setDialog] = useState({ open: false, account: null, preset: null });
  const { data: user } = useCurrentUser();
  const canCreate = hasPermission(user, WebPermissions.ACCOUNT_CREATE);
  const canModify = hasPermission(user, WebPermissions.ACCOUNT_MODIFY);

  const { data: accounts = [], isLoading, isError } = useAccounts(showInactive ? { includeInactive: 'true' } : {});
  const update = useUpdateAccount();

  const toggleActive = async (account) => {
    try {
      await update.mutateAsync({ id: account.id, isActive: !account.isActive });
      toast.success(`${account.name} ${account.isActive ? 'deactivated' : 'reactivated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the account.');
    }
  };

  if (isLoading) return <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />;
  if (isError) return <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load the chart of accounts.</div>;

  return (
    <div className="space-y-4">
      <DataTable
        columns={[
          { accessorKey: 'code', header: 'Code' },
          {
            id: 'name', header: 'Account',
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                {row.original.subType === 'BANK' && <Landmark size={14} className="text-muted-foreground" aria-label="Bank account" />}
                {row.original.subType === 'CASH' && <Wallet size={14} className="text-muted-foreground" aria-label="Cash account" />}
                <span className={row.original.isActive ? '' : 'text-muted-foreground line-through'}>{row.original.name}</span>
                {row.original.isSystem && <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1">System</span>}
              </div>
            ),
          },
          { id: 'group', header: 'Group', cell: ({ row }) => row.original.groupLabel },
          { id: 'type', header: 'Type', cell: ({ row }) => TYPE_LABEL[row.original.type] || row.original.type },
          {
            id: 'bank', header: 'Bank details',
            cell: ({ row }) => (row.original.subType === 'BANK'
              ? [row.original.bankName, row.original.accountNumber && `A/c ${row.original.accountNumber}`, row.original.ifsc].filter(Boolean).join(' · ') || '—'
              : ''),
          },
          {
            id: 'actions', header: '',
            cell: ({ row }) => canModify && (
              <div className="flex justify-end gap-3 text-xs">
                <button className="text-primary hover:underline" onClick={() => setDialog({ open: true, account: row.original, preset: null })}>Edit</button>
                {!row.original.isSystem && (
                  <button className="text-muted-foreground hover:underline" onClick={() => toggleActive(row.original)}>
                    {row.original.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            ),
          },
        ]}
        data={accounts}
        searchKey="name"
        actionsNode={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
            </label>
            {canCreate && (
              <>
                <Button variant="outline" onClick={() => setDialog({ open: true, account: null, preset: { accountGroup: 'CURRENT_ASSET', subType: 'BANK' } })}>
                  <Landmark size={16} /> Add bank account
                </Button>
                <Button onClick={() => setDialog({ open: true, account: null, preset: null })}>
                  <Plus size={16} /> Add account
                </Button>
              </>
            )}
            <MasterImportExportActions
              module="accounts"
              label="Chart of Accounts"
              resource="ACCOUNT"
              filters={{ ...(showInactive ? { includeInactive: 'true' } : {}) }}
            />
          </div>
        }
      />

      <AccountFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        account={dialog.account}
        preset={dialog.preset}
      />
    </div>
  );
}

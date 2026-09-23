import { useState } from 'react';
import { Calculator, Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { DateText } from '@/components/date-text';
import { usePaginated } from '@/hooks/use-paginated';
import { useFixedAssets, useDepreciationRuns, useCancelDepreciationRun } from '@/hooks/use-fixed-assets';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { cn } from '@/lib/utils';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import { DepreciationRunDialog } from '@/components/assets/depreciation-run-dialog';
import { DisposeAssetDialog } from '@/components/assets/dispose-asset-dialog';
import { toast } from 'sonner';

const METHOD_LABEL = { SLM: 'Straight line', WDV: 'WDV' };

function RunsList({ canCancel, showRates }) {
  const { query, tableProps } = usePaginated(useDepreciationRuns);
  const cancel = useCancelDepreciationRun();
  const [cancelling, setCancelling] = useState(null);

  if (query.isLoading) return <div className="w-full h-48 rounded-xl border border-border bg-card animate-pulse" />;
  return (
    <>
      <DataTable
        columns={[
          { accessorKey: 'runNumber', header: 'Run #' },
          { id: 'upTo', header: 'Up to', cell: ({ row }) => <DateText value={row.original.upToDate} /> },
          { id: 'assets', header: 'Assets', cell: ({ row }) => row.original.lines.length },
          ...(showRates ? [{ id: 'total', header: 'Charged', cell: ({ row }) => formatINR(row.original.totalPaise) }] : []),
          { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'POSTED' ? 'active' : 'inactive'} /> },
          {
            id: 'actions', header: '',
            cell: ({ row }) => canCancel && row.original.status === 'POSTED' && (
              <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => setCancelling(row.original)}>Undo</button></div>
            ),
          },
        ]}
        {...tableProps}
      />
      <ReasonDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Undo ${cancelling?.runNumber}`}
        description="Runs are undone latest first. Each asset goes back to where it was before this run, and the charge is reversed on the run's own date."
        label="Reason"
        placeholder="e.g. Wrong rate on the batching plant"
        confirmText="Undo run"
        variant="destructive"
        onConfirm={async (reason) => {
          try {
            await cancel.mutateAsync({ id: cancelling.id, reason });
            toast.success('Depreciation run undone');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not undo the run.');
            throw err;
          }
        }}
      />
    </>
  );
}

export default function FixedAssetsPage() {
  const [view, setView] = useState('register');
  const [status, setStatus] = useState('ACTIVE');
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState(false);
  const [disposing, setDisposing] = useState(null);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canCreate = hasPermission(user, WebPermissions.FIXED_ASSET_CREATE);
  const canModify = hasPermission(user, WebPermissions.FIXED_ASSET_MODIFY);

  const { query, tableProps } = usePaginated(useFixedAssets, status ? { status } : {});

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {[['register', 'Asset register'], ['runs', 'Depreciation runs']].map(([key, label]) => (
          <button
            key={key} onClick={() => setView(key)}
            className={cn('px-3 py-1.5 text-sm rounded-md', view === key ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'runs' ? (
        <RunsList canCancel={canModify} showRates={showRates} />
      ) : query.isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : query.isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load fixed assets.</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: 'assetNumber', header: 'Asset #' },
            {
              id: 'name', header: 'Asset',
              cell: ({ row }) => (
                <div>
                  <div>{row.original.name}</div>
                  <div className="text-xs text-muted-foreground">{row.original.category}{row.original.serialNumber ? ` · ${row.original.serialNumber}` : ''}</div>
                </div>
              ),
            },
            { id: 'inUse', header: 'In use from', cell: ({ row }) => <DateText value={row.original.putToUseDate} /> },
            {
              id: 'method', header: 'Method',
              cell: ({ row }) => `${METHOD_LABEL[row.original.method]} · ${row.original.method === 'SLM' ? `${(row.original.usefulLifeMonths / 12).toFixed(1).replace(/\.0$/, '')} yrs` : `${row.original.ratePercent}%`}`,
            },
            ...(showRates ? [
              { id: 'cost', header: 'Cost', cell: ({ row }) => formatINR(row.original.costPaise) },
              { id: 'dep', header: 'Depreciated', cell: ({ row }) => formatINR(row.original.accumulatedDepreciationPaise) },
              { id: 'book', header: 'Book value', cell: ({ row }) => <span className="font-medium">{formatINR(row.original.bookValuePaise)}</span> },
            ] : []),
            { id: 'upTo', header: 'Charged to', cell: ({ row }) => (row.original.depreciatedUpTo ? <DateText value={row.original.depreciatedUpTo} /> : '—') },
            {
              id: 'status', header: 'Status',
              cell: ({ row }) => <StatusBadge status={row.original.status === 'ACTIVE' ? 'active' : 'inactive'} />,
            },
            {
              id: 'actions', header: '',
              cell: ({ row }) => canModify && row.original.status === 'ACTIVE' && (
                <div className="flex justify-end"><button className="text-xs text-destructive hover:underline" onClick={() => setDisposing(row.original)}>Dispose</button></div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search asset no, name, category…"
          actionsNode={
            <div className="flex items-center gap-2">
              <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="ACTIVE">In use</option>
                <option value="DISPOSED">Disposed</option>
                <option value="">All</option>
              </select>
              {canCreate && (
                <>
                  <Button variant="outline" onClick={() => setRunning(true)}><Calculator size={16} /> Run depreciation</Button>
                  <Button onClick={() => setAdding(true)}><Plus size={16} /> Register asset</Button>
                </>
              )}
            </div>
          }
        />
      )}

      <AssetFormDialog open={adding} onOpenChange={setAdding} />
      <DepreciationRunDialog open={running} onOpenChange={setRunning} />
      <DisposeAssetDialog asset={disposing} onOpenChange={(open) => !open && setDisposing(null)} />
    </div>
  );
}

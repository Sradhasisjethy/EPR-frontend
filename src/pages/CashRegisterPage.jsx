import { useEffect, useState } from 'react';
import { LockKeyhole, Unlock } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DateText } from '@/components/date-text';
import { usePaginated } from '@/hooks/use-paginated';
import { useFactories } from '@/hooks/use-factory';
import { useCurrentTill, useTillSessions } from '@/hooks/use-cash-register';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { OpenTillDialog, CloseTillDialog } from '@/components/cash-register/till-dialogs';

const Variance = ({ paise }) => {
  if (paise === null || paise === undefined) return '—';
  if (paise === 0) return <span className="text-emerald-600">Balanced</span>;
  return (
    <span className={paise < 0 ? 'text-rose-600' : 'text-amber-600'}>
      {formatINR(Math.abs(paise))} {paise < 0 ? 'short' : 'over'}
    </span>
  );
};

export default function CashRegisterPage() {
  const [factoryId, setFactoryId] = useState('');
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(null);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canOpen = hasPermission(user, WebPermissions.CASH_REGISTER_CREATE);
  const canClose = hasPermission(user, WebPermissions.CASH_REGISTER_MODIFY);

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const factories = factoryData?.rows || [];
  useEffect(() => {
    if (!factoryId && factories.length === 1) setFactoryId(factories[0].id);
  }, [factoryId, factories]);

  const till = useCurrentTill(factoryId);
  const { query, tableProps } = usePaginated(useTillSessions, factoryId ? { factoryId } : {});
  const open = till.data;
  const { glassMode } = useUIStore();

  return (
    <div className="space-y-5">
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="till-factory" className={cn(glassMode && "text-foreground/90 font-medium")}>Factory</Label>
        <select
          id="till-factory"
          value={factoryId}
          onChange={(e) => setFactoryId(e.target.value)}
          className={cn(
            "w-full h-9 px-3 rounded-md border text-sm transition-all",
            glassMode ? "glass-surface border-white/25 text-foreground" : "border-input bg-background"
          )}
        >
          <option value="">Select factory</option>
          {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {factoryId && (
        till.isLoading ? (
          <div className="h-28 rounded-xl border border-border bg-card animate-pulse" />
        ) : open ? (
          <div className={cn(
            "p-4 rounded-2xl border flex flex-wrap items-center gap-x-8 gap-y-3 shadow-xs",
            glassMode ? "glass-card border-white/20 dark:border-white/10" : "bg-card border-border"
          )}>
            <div>
              <p className={cn("text-xs", glassMode ? "text-foreground/75 font-medium" : "text-muted-foreground")}>Till open · {open.sessionNumber}</p>
              <p className="font-medium">since <DateText value={open.openedAt} withTime /></p>
            </div>
            {showRates && (
              <>
                <div><p className={cn("text-xs", glassMode ? "text-foreground/75" : "text-muted-foreground")}>Opened with</p><p className="font-medium tabular-nums">{formatINR(open.openingCountedPaise)}</p></div>
                <div><p className={cn("text-xs", glassMode ? "text-foreground/75" : "text-muted-foreground")}>Cash in</p><p className="font-medium tabular-nums text-emerald-600">{formatINR(open.totalInPaise)}</p></div>
                <div><p className={cn("text-xs", glassMode ? "text-foreground/75" : "text-muted-foreground")}>Cash out</p><p className="font-medium tabular-nums text-rose-600">{formatINR(open.totalOutPaise)}</p></div>
                <div><p className={cn("text-xs", glassMode ? "text-foreground/75" : "text-muted-foreground")}>Should be in the drawer</p><p className="text-lg font-semibold tabular-nums">{formatINR(open.expectedNowPaise)}</p></div>
              </>
            )}
            {canClose && (
              <Button className="ml-auto" onClick={() => setClosing(open)}><LockKeyhole size={16} /> Close till</Button>
            )}
          </div>
        ) : (
          <div className={cn(
            "p-8 text-center rounded-2xl border transition-all",
            glassMode ? "glass-card border-white/20 text-foreground/85 shadow-xs" : "border-dashed border-border"
          )}>
            <p className={cn("text-sm", glassMode ? "text-foreground/85 font-medium" : "text-muted-foreground")}>No till is open at this factory.</p>
            {canOpen && <Button className="mt-3" onClick={() => setOpening(true)}><Unlock size={16} /> Open till</Button>}
          </div>
        )
      )}

      {factoryId && (
        query.isLoading ? (
          <div className="w-full h-64 rounded-xl border border-border bg-card animate-pulse" />
        ) : (
          <DataTable
            columns={[
              { accessorKey: 'sessionNumber', header: 'Session' },
              { id: 'opened', header: 'Opened', cell: ({ row }) => <DateText value={row.original.openedAt} withTime /> },
              { id: 'closed', header: 'Closed', cell: ({ row }) => (row.original.closedAt ? <DateText value={row.original.closedAt} withTime /> : '—') },
              ...(showRates ? [
                { id: 'openingCount', header: 'Opening count', cell: ({ row }) => formatINR(row.original.openingCountedPaise) },
                { id: 'closingCount', header: 'Closing count', cell: ({ row }) => (row.original.closingCountedPaise === null ? '—' : formatINR(row.original.closingCountedPaise)) },
                { id: 'variance', header: 'Difference', cell: ({ row }) => <Variance paise={row.original.closingVariancePaise} /> },
                {
                  id: 'adjusted', header: 'Written off',
                  cell: ({ row }) => (row.original.closingVariancePaise ? (row.original.varianceAdjusted ? 'Yes' : 'No') : ''),
                },
              ] : []),
              {
                id: 'status', header: 'Status',
                cell: ({ row }) => (
                  <span className={cn('text-xs font-medium', row.original.status === 'OPEN' ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {row.original.status === 'OPEN' ? 'Open' : 'Closed'}
                  </span>
                ),
              },
            ]}
            {...tableProps}
          />
        )
      )}

      <OpenTillDialog open={opening} onOpenChange={setOpening} factoryId={factoryId} />
      <CloseTillDialog session={closing} onOpenChange={(isOpen) => !isOpen && setClosing(null)} />
    </div>
  );
}

import { cn } from '@/lib/utils';
import { useAvailableToPromise } from '@/hooks/use-sales';

/**
 * FR-M06-3: shows live per-factory availability while a sales order line is
 * being entered.
 *
 * Curing stock is shown as its own figure and is NOT folded into "available".
 * That separation is the whole point (AC-3.1): a salesperson who sees a single
 * combined number will promise stock that legally cannot ship yet.
 */
export function LineAvailability({ factoryId, productId, orderedQty }) {
  const { data, isLoading } = useAvailableToPromise(factoryId, productId);

  if (!factoryId || !productId) return null;
  if (isLoading || !data) return <p className="text-xs text-muted-foreground">Checking stock…</p>;

  const wanted = Number(orderedQty) || 0;
  const shortfall = Math.max(0, wanted - Number(data.available || 0));

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-muted-foreground">
        Available <span className="font-medium text-foreground tabular-nums">{data.available}</span>
      </span>
      {data.curing > 0 && (
        <span className="text-amber-600 dark:text-amber-400">
          Curing <span className="font-medium tabular-nums">{data.curing}</span>
        </span>
      )}
      {data.reserved > 0 && (
        <span className="text-muted-foreground">
          Reserved <span className="font-medium text-foreground tabular-nums">{data.reserved}</span>
        </span>
      )}
      {data.inTransit > 0 && (
        <span className="text-violet-600 dark:text-violet-400">
          In transit <span className="font-medium tabular-nums">{data.inTransit}</span>
        </span>
      )}
      {wanted > 0 && (
        <span className={cn('font-medium', shortfall > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
          {shortfall > 0 ? `Shortfall ${shortfall} — needs production` : 'Covered from stock'}
        </span>
      )}
    </div>
  );
}

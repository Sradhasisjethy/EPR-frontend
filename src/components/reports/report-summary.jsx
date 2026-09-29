import { cn } from '@/lib/utils';
import { formatMetric } from '@/lib/report-format';
import { useUIStore } from '@/store/ui-store';

/**
 * Summary tiles above the table.
 *
 * These are aggregates over the *whole* filtered result set, computed
 * server-side — not a total of the rows on screen. That distinction is the
 * whole point of the component, so the caption says which filters produced
 * them rather than leaving the reader to assume.
 *
 * Deliberately restrained: a thin bordered tile, no icon, no gradient. A row of
 * six of these sits directly above a dense table, and anything heavier competes
 * with the data for attention.
 */
export function ReportSummary({ metrics, summary, trends }) {
  const { glassMode } = useUIStore();
  if (!metrics?.length) return null;

  return (
    <section aria-label="Report summary">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {metrics.map((metric) => {
          const trend = trends?.[metric.key];
          return (
            <div key={metric.key} className={cn("rounded-xl border border-border px-4 py-3.5 shadow-xs transition-all", glassMode ? "glass-card" : "bg-card")}>
              <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground" title={metric.label}>
                {metric.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums leading-tight">
                {formatMetric(summary?.[metric.key], metric)}
              </dd>
              {typeof trend === 'number' && (
                <dd
                  className={cn(
                    'mt-1 text-xs font-medium tabular-nums',
                    trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : trend < 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {/* An arrow as well as the colour, so the direction survives
                      monochrome printing and colour-blind readers. */}
                  {trend > 0 ? '▲' : trend < 0 ? '▼' : '–'} {Math.abs(trend)}% vs previous period
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';

/**
 * Two levels of navigation inside one module: category tabs across the top,
 * then the reports in that category as a row of chips.
 *
 * This is the shape the redesign exists to produce — a Reports entry in the
 * sidebar that opens onto forty-odd reports organised by subject, instead of
 * forty-odd sidebar items.
 */

export function ReportCategoryTabs({ categories, activeCategory }) {
  const { glassMode } = useUIStore();

  if (glassMode) {
    return (
      <div className="glass-card flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto shadow-xs mb-3" role="tablist" aria-label="Report categories">
        {categories.map((category) => {
          const active = category.id === activeCategory;
          return (
            <Link
              key={category.id}
              to={`/reports/${category.id}`}
              role="tab"
              aria-selected={active}
              title={category.description}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-foreground/75 hover:text-foreground hover:bg-card/70'
              )}
            >
              {category.name}
              <span className={cn('ml-1 text-xs px-1.5 py-0.2 rounded-full font-bold', active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {category.reports.length}
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="-mb-px flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Report categories">
      {categories.map((category) => {
        const active = category.id === activeCategory;
        return (
          <Link
            key={category.id}
            to={`/reports/${category.id}`}
            role="tab"
            aria-selected={active}
            title={category.description}
            className={cn(
              'whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            {category.name}
            <span className="ml-1.5 text-xs opacity-60">{category.reports.length}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function ReportPicker({ category, activeReport }) {
  const { glassMode } = useUIStore();
  if (!category) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5 p-1 rounded-2xl", glassMode && "glass-card p-2 shadow-xs mb-1")} role="tablist" aria-label={`${category.name} reports`}>
      {category.reports.map((report) => {
        const active = report.slug === activeReport;
        return (
          <Link
            key={report.id}
            to={`/reports/${category.id}/${report.slug}`}
            role="tab"
            aria-selected={active}
            title={report.description}
            className={cn(
              'rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-primary bg-primary text-primary-foreground shadow-sm font-semibold'
                : glassMode
                  ? 'border-border/60 bg-background/60 text-foreground/80 hover:bg-background/90 hover:text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground'
            )}
          >
            {report.name}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * What this report cannot show, and why.
 *
 * Surfaced in the UI rather than buried in documentation: a reader who expects
 * a Discount column deserves to be told the system does not record one, instead
 * of assuming every discount happened to be zero.
 */
export function ReportLimitations({ limitations }) {
  const { glassMode } = useUIStore();
  if (!limitations?.length) return null;

  return (
    <details className={cn("group rounded-xl border border-border px-3.5 py-2.5 text-sm", glassMode ? "glass-card shadow-xs" : "bg-muted/30")}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground marker:hidden">
        <Info size={14} aria-hidden="true" />
        <span className="font-medium">
          {limitations.length === 1 ? 'One note about this report' : `${limitations.length} notes about this report`}
        </span>
        <span className="ml-auto text-xs opacity-60 group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs opacity-60 group-open:inline">Hide</span>
      </summary>
      <ul className="mt-2 space-y-1.5 pl-6 text-muted-foreground">
        {limitations.map((limitation) => (
          <li key={limitation} className="list-disc text-[13px] leading-relaxed">
            {limitation}
          </li>
        ))}
      </ul>
    </details>
  );
}

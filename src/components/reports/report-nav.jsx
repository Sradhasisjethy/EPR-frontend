import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Two levels of navigation inside one module: category tabs across the top,
 * then the reports in that category as a row of chips.
 *
 * This is the shape the redesign exists to produce — a Reports entry in the
 * sidebar that opens onto forty-odd reports organised by subject, instead of
 * forty-odd sidebar items.
 */

export function ReportCategoryTabs({ categories, activeCategory }) {
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
  if (!category) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={`${category.name} reports`}>
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
              'rounded-full border px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-primary bg-primary/10 font-medium text-primary'
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
  if (!limitations?.length) return null;

  return (
    <details className="group rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
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

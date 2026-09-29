import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFactories } from '@/hooks/use-factory';
import { useParties } from '@/hooks/use-parties';
import { useProducts, useProductCategories } from '@/hooks/use-products';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';

/**
 * Filter controls, rendered from the descriptors the server publishes with each
 * report (backend src/api/reports/lib/filters.js).
 *
 * Nothing here decides what a filter means. The server says a report takes a
 * "Status" that is a party's active/inactive flag, or one that is a sales
 * order's lifecycle — and this renders whichever it was told. That is what
 * keeps irrelevant filters off a report and wrong options out of a dropdown
 * without a per-report component.
 */

/**
 * One shared fetch per entity type, reused by every picker on the screen.
 *
 * These are master lists (locations, parties, products) that every report
 * screen needs, so they are fetched unconditionally and served from the
 * react-query cache on subsequent reports rather than being torn down and
 * refetched each time the user switches report.
 *
 * Capped at 100 because the backend validation schemas (parties, factory,
 * products) enforce `limit.max(100)`.
 */
const MASTER_LIMIT = 100;

function useEntityOptions() {
  const factories = useFactories({ page: 1, limit: MASTER_LIMIT });
  const products = useProducts({ page: 1, limit: MASTER_LIMIT });
  const categories = useProductCategories({ page: 1, limit: MASTER_LIMIT });
  // Parties are fetched per type rather than in one unfiltered call, so a
  // customer picker cannot end up listing vendors.
  const customers = useParties({ page: 1, limit: MASTER_LIMIT, partyType: 'CUSTOMER' });
  const vendors = useParties({ page: 1, limit: MASTER_LIMIT, partyType: 'VENDOR' });
  const contractors = useParties({ page: 1, limit: MASTER_LIMIT, partyType: 'CONTRACTOR' });
  const labour = useParties({ page: 1, limit: MASTER_LIMIT, partyType: 'LABOUR' });
  const allParties = useParties({ page: 1, limit: MASTER_LIMIT });

  return useMemo(() => {
    const toOptions = (query, label = (row) => row.name) =>
      (query.data?.rows || []).map((row) => ({ value: row.id, label: row.code ? `${label(row)} (${row.code})` : label(row) }));

    return {
      factories: toOptions(factories),
      products: toOptions(products),
      'product-categories': toOptions(categories),
      CUSTOMER: toOptions(customers),
      VENDOR: toOptions(vendors),
      CONTRACTOR: toOptions(contractors),
      LABOUR: toOptions(labour),
      parties: toOptions(allParties),
    };
  }, [factories.data, products.data, categories.data, customers.data, vendors.data, contractors.data, labour.data, allParties.data]); // eslint-disable-line react-hooks/exhaustive-deps
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50';

function FilterControl({ control, value, onChange, entityOptions }) {
  const { glassMode } = useUIStore();
  const id = `report-filter-${control.key}`;

  if (control.control === 'toggle') {
    return (
      <label htmlFor={id} className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-2.5 text-sm", glassMode ? "glass-surface text-foreground" : "bg-background")}>
        <input
          id={id}
          type="checkbox"
          checked={value === 'true' || value === true}
          onChange={(event) => onChange(event.target.checked ? 'true' : '')}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        {control.label}
      </label>
    );
  }

  const field = (() => {
    if (control.control === 'date') {
      return <Input id={id} type="date" value={value || ''} onChange={(event) => onChange(event.target.value)} className={cn("h-9", glassMode && "glass-surface text-foreground")} />;
    }

    if (control.control === 'text') {
      return (
        <Input
          id={id}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Any ${control.label.toLowerCase()}`}
          className={cn("h-9", glassMode && "glass-surface text-foreground")}
        />
      );
    }

    const options =
      control.control === 'entity'
        ? entityOptions[control.partyType || control.source] || []
        : control.options || [];

    return (
      <select
        id={id}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-9 w-full rounded-md border px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50",
          glassMode ? "glass-surface border-input text-foreground" : "border-input bg-background"
        )}
      >
        <option value="" className="bg-popover text-popover-foreground">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-popover text-popover-foreground">
            {option.label}
          </option>
        ))}
      </select>
    );
  })();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {control.label}
      </Label>
      {field}
    </div>
  );
}

export function ReportFilters({ controls, values, onChange, showSecondary, className }) {
  const entityOptions = useEntityOptions();
  const visible = showSecondary ? controls : controls.filter((control) => control.primary);

  if (!visible.length) return null;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5', className)}>
      {visible.map((control) => (
        <FilterControl
          key={control.key}
          control={control}
          value={values[control.key]}
          onChange={(next) => onChange(control.key, next)}
          entityOptions={entityOptions}
        />
      ))}
    </div>
  );
}

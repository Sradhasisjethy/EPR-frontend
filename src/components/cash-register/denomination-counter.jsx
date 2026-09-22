import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { formatINR } from '@/lib/money';

/** Indian notes and coins, largest first — the order a drawer is counted in. */
export const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export const countTotalPaise = (counts) =>
  DENOMINATIONS.reduce((sum, note) => sum + note * 100 * (Number(counts[note]) || 0), 0);

/** Drops empty rows: the API takes only the denominations actually present. */
export const toDenominations = (counts) =>
  Object.fromEntries(DENOMINATIONS.filter((n) => Number(counts[n]) > 0).map((n) => [String(n), Number(counts[n])]));

export function DenominationCounter({ counts, onChange, label = 'Count the drawer' }) {
  const total = useMemo(() => countTotalPaise(counts), [counts]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {DENOMINATIONS.map((note) => (
          <div key={note} className="flex items-center gap-2">
            <label htmlFor={`denom-${note}`} className="w-12 text-sm text-muted-foreground text-right">₹{note}</label>
            <Input
              id={`denom-${note}`} aria-label={`Number of ${note} rupee notes`}
              type="number" min="0" step="1" inputMode="numeric" className="h-8 text-right"
              value={counts[note] ?? ''}
              onChange={(e) => onChange({ ...counts, [note]: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))) })}
            />
          </div>
        ))}
      </div>
      <p className="text-right text-sm">
        Counted <span className="font-semibold tabular-nums">{formatINR(total)}</span>
      </p>
    </div>
  );
}

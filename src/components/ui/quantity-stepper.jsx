import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * A quantity you can nudge or type.
 *
 * Kept as its own component because a bundle is a tree and every node in it —
 * the parent and each accessory under it — needs the same control with the same
 * behaviour. Changing a parent rescales its children; changing a child takes
 * that number out of the system's hands. The stepper does not know or care
 * which: it reports a number and the caller decides what it means.
 *
 * It holds a local draft while typing so a half-entered value never reaches the
 * server — "1" on the way to "12" would otherwise fire a request that rescales
 * the whole group, and the accessories would visibly flap.
 */
export function QuantityStepper({ value, onCommit, disabled = false, step = 1, min = 0, label }) {
  const [draft, setDraft] = useState(String(value ?? ''));

  // The server is the authority: when it answers with a different number — a
  // rescale, a reset, a rejected edit — the field follows it.
  useEffect(() => setDraft(String(value ?? '')), [value]);

  const commit = (next) => {
    const parsed = Number(next);
    if (!Number.isFinite(parsed) || parsed <= min) {
      setDraft(String(value ?? ''));   // put back what it was
      return;
    }
    if (parsed === Number(value)) return;
    onCommit(parsed);
  };

  const nudge = (delta) => {
    const next = Number(value || 0) + delta;
    if (next <= min) return;
    onCommit(next);
  };

  // The group deliberately carries no aria-label: the input inside already has
  // `label`, and duplicating it makes every accessible query ambiguous.
  return (
    <div className="inline-flex items-center gap-0.5" role="group">
      <button
        type="button"
        disabled={disabled || Number(value || 0) - step <= min}
        onClick={() => nudge(-step)}
        aria-label={`Decrease ${label || 'quantity'}`}
        className="h-6 w-6 rounded border border-input flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
      >
        <Minus size={11} />
      </button>

      <input
        value={draft}
        disabled={disabled}
        aria-label={label || 'Quantity'}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
          if (e.key === 'Escape') setDraft(String(value ?? ''));
        }}
        className="h-6 w-14 rounded border border-input bg-background px-1.5 text-xs text-right tabular-nums disabled:opacity-50"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => nudge(step)}
        aria-label={`Increase ${label || 'quantity'}`}
        className="h-6 w-6 rounded border border-input flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

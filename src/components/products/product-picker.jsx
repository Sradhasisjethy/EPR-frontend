import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useProducts, useProduct } from '@/hooks/use-products';

/**
 * Product chooser that searches the server as you type.
 *
 * It replaces a plain `<select>` fed by a single list request. That approach
 * had a failure mode with no symptom: the list endpoint caps `limit` at 100, so
 * once a catalogue passes a hundred products the dropdown quietly shows the
 * first hundred alphabetically and everything after that becomes unselectable.
 * Nothing errors — the item simply is not there.
 *
 * Searching server-side removes the ceiling entirely, and the count line says
 * plainly when there is more than the page being shown.
 */

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 250;

export function ProductPicker({
  value,
  onChange,
  filters = {},
  placeholder = 'Search products…',
  disabled = false,
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useProducts({
    page: 1,
    limit: PAGE_SIZE,
    ...(debounced ? { search: debounced } : {}),
    ...filters,
  });

  // The chosen product may not be in the current page of results — when editing
  // an existing record it usually is not — so its label is fetched by id.
  const { data: selected } = useProduct(value || undefined);

  const rows = useMemo(() => data?.rows || [], [data]);
  const total = Number(data?.count ?? rows.length);
  const hasMore = total > rows.length;

  useEffect(() => setHighlight(0), [debounced, open]);

  // Clicking anywhere else closes it, which a native select does for free.
  useEffect(() => {
    if (!open) return undefined;
    const onDocumentClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    // pointerdown, not mousedown: a pen or finger does not always produce
    // a mouse event before the tap lands, so the menu could stay open
    // behind whatever was tapped next.
    document.addEventListener('pointerdown', onDocumentClick);
    return () => document.removeEventListener('pointerdown', onDocumentClick);
  }, [open]);

  const choose = (product) => {
    onChange(product.id, product);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open && rows[highlight]) {
      e.preventDefault();
      choose(rows[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const label = selected ? selected.name : '';

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          autoFocus={autoFocus}
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-left flex items-center justify-between gap-2 disabled:opacity-50"
        >
          <span className={label ? 'truncate' : 'truncate text-muted-foreground'}>
            {label || placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value && (
              <X
                size={13}
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onChange('', null); }}
                aria-label="Clear"
              />
            )}
            <ChevronDown size={14} className="text-muted-foreground" aria-hidden="true" />
          </span>
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {isFetching ? 'Searching…' : debounced ? `Nothing matches "${debounced}".` : 'No products found.'}
            </p>
          ) : (
            <>
              {rows.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(p)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 ${
                    i === highlight ? 'bg-muted' : ''
                  } ${p.id === value ? 'font-medium' : ''}`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{p.code}</span>
                </button>
              ))}
              {/* Says so rather than silently truncating, which is the bug this
                  component exists to remove. */}
              {hasMore && (
                <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/60">
                  Showing {rows.length} of {total} — type to narrow it down.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

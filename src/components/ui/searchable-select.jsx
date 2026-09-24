import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A picker that asks the server, instead of a `<select>` holding the first 100 rows.
 *
 * Every entity dropdown in this app was built the same way: fetch one page with
 * `limit: 100` and render an `<option>` for each. That works until the hundredth
 * record and then fails silently — the customer is not in the list, there is no
 * message saying so, and the only clue is that scrolling ends sooner than it
 * should. With 429 customers, three quarters of them simply cannot be chosen.
 *
 * Raising the limit only moves the cliff. So this searches: it sends what the
 * user types to the same list endpoint every screen already uses, which filters
 * in SQL over every row. It holds twenty rows in the browser whether the tenant
 * has fifty customers or fifty thousand, and it says how many matched, so "not
 * in the list" is never a guess.
 *
 * ## Why the list is in a portal
 *
 * These pickers live in dialogs, and a dialog both scrolls its content and
 * carries a `translate` for centring. The scrolling clips anything hanging past
 * its edge, and the transform makes the dialog a containing block, so even
 * `position: fixed` is trapped inside it. Rendered in place, the list was cut
 * off at the dialog border with most of the results unreachable.
 *
 * So the list is portalled to the body and positioned against the field, while
 * the text box it belongs to stays inside the dialog. That split is the point:
 * focus never leaves the dialog, so its focus trap has nothing to fight, and
 * the list only has to keep its own pointer events from reaching the document —
 * otherwise the dialog reads a click on a customer as a click outside itself
 * and closes before the choice lands.
 *
 * @param {Function} useOptions   a list hook, e.g. useParties
 * @param {object}   filters      fixed filters merged into every request
 * @param {Function} getOptionLabel   option -> the text shown for it
 * @param {Function} [getOptionHint]  option -> a dimmer trailing detail, e.g. a code
 * @param {object}   [initialOption]  the current value as a record, for edit forms
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  useOptions,
  filters = {},
  getOptionLabel,
  getOptionHint,
  getOptionValue = (option) => option.id,
  initialOption = null,
  placeholder = 'Select…',
  // For an optional field: an entry at the top of the list that clears it. The
  // `<select>` boxes this replaces expressed that as `<option value="">None`,
  // and without it an optional reference could be set but never unset.
  emptyOptionLabel = null,
  // What clearing sets. Usually '', but the counter sale uses a sentinel for
  // the walk-in buyer, which is a real choice rather than the absence of one.
  emptyOptionValue = '',
  searchPlaceholder = 'Type to search…',
  emptyMessage = 'Nothing matches that.',
  disabled = false,
  pageSize = 20,
  className,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState(initialOption);
  const [anchor, setAnchor] = useState(null);

  const fieldRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  // Long enough that typing a name is one request, short enough to feel live.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(timer);
  }, [term]);

  const params = useMemo(
    () => ({ page: 1, limit: pageSize, ...(debounced ? { search: debounced } : {}), ...filters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounced, pageSize, JSON.stringify(filters)]
  );

  // Only fetch while the menu is open: a closed picker on a form with eight of
  // them should not cost eight requests on mount.
  const query = useOptions(params, { enabled: open });
  const rows = useMemo(() => (Array.isArray(query.data?.rows) ? query.data.rows : []), [query.data]);
  const total = Number(query.data?.count ?? rows.length);

  // A value set from outside (an edit form, or a reset) whose record we have
  // not seen. Match it against whatever is loaded rather than showing an id.
  useEffect(() => {
    if (!value || value === emptyOptionValue) { setChosen(null); return; }
    if (chosen && getOptionValue(chosen) === value) return;
    const match = rows.find((row) => getOptionValue(row) === value);
    if (match) setChosen(match);
  }, [value, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (initialOption) setChosen(initialOption); }, [initialOption]);

  /** Where the list should sit, and which way it should open. */
  const place = useCallback(() => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const upward = below < 220 && above > below;
    setAnchor({
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      width: rect.width,
      upward,
      room: Math.max(Math.min(upward ? above : below, 320), 120),
    });
  }, []);

  useEffect(() => {
    if (!open) { setTerm(''); setDebounced(''); return undefined; }
    setActive(0);
    place();
    // Capture, so it follows a scroll inside the dialog and not just the page.
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  /**
   * Let the wheel scroll this list.
   *
   * A modal dialog locks scrolling with react-remove-scroll, which listens for
   * `wheel` on the document and calls preventDefault on anything outside the
   * dialog subtree. This list is portalled to the body, so it was caught by
   * that: the scrollbar could be dragged but the wheel and the trackpad did
   * nothing at all.
   *
   * The lock listens during bubbling, so stopping the event here — at the list,
   * long before it reaches the document — means the lock never sees it and
   * never cancels it, and the browser scrolls the list natively. Everything
   * outside stays locked, which is the point of the lock.
   */
  useEffect(() => {
    const node = listRef.current;
    if (!open || !node) return undefined;
    const keep = (event) => event.stopPropagation();
    node.addEventListener('wheel', keep, { passive: false });
    node.addEventListener('touchmove', keep, { passive: false });
    return () => {
      node.removeEventListener('wheel', keep);
      node.removeEventListener('touchmove', keep);
    };
  }, [open, anchor]);

  // Close on a click outside either half — the field or the portalled list.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (fieldRef.current?.contains(event.target)) return;
      if (listRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const commit = (option) => {
    setChosen(option);
    onChange(option ? getOptionValue(option) : emptyOptionValue, option);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, rows.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (rows[active]) commit(rows[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  const label = chosen ? getOptionLabel(chosen) : '';

  const list = open && anchor ? (
    <div
      ref={listRef}
      style={{
        position: 'fixed',
        left: anchor.left,
        ...(anchor.upward ? { bottom: anchor.bottom } : { top: anchor.top }),
        minWidth: anchor.width,
        maxWidth: `min(28rem, calc(100vw - ${Math.round(anchor.left)}px - 1rem))`,
        // A modal dialog sets `pointer-events: none` on the body so nothing
        // behind it can be clicked, and this list is a child of the body. Left
        // to inherit, every option would look right and do nothing.
        pointerEvents: 'auto',
      }}
      // Stop the dialog reading a click on a customer as a click outside it.
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      className="z-[60] w-max rounded-md border border-border bg-popover shadow-lg"
    >
      <ul id={listId} role="listbox" style={{ maxHeight: anchor.room }} className="overflow-auto overscroll-contain py-1">
        {emptyOptionLabel && (
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === emptyOptionValue}
              onClick={() => commit(null)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
            >
              <Check size={14} className={cn('shrink-0', value === emptyOptionValue ? 'opacity-100' : 'opacity-0')} />
              {emptyOptionLabel}
            </button>
          </li>
        )}
        {rows.length === 0 && !query.isFetching && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</li>
        )}
        {rows.map((option, index) => {
          const optionValue = getOptionValue(option);
          const selected = optionValue === value;
          const optionLabel = getOptionLabel(option);
          const hint = getOptionHint ? getOptionHint(option) : null;
          // Several tenants put the code inside the name — "Ajay Behera
          // (LABR-0059)" — and showing it again beside it is just noise.
          const showHint = hint && !String(optionLabel).includes(String(hint));
          return (
            <li key={optionValue}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onClick={() => commit(option)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                  index === active && 'bg-accent text-accent-foreground'
                )}
              >
                <Check size={14} className={cn('shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                <span className="min-w-0 flex-1 truncate">{optionLabel}</span>
                {/* The hint is the secondary detail, so it gives way first
                    rather than starving the name it is meant to qualify. */}
                {showHint && (
                  <span className="ml-auto max-w-[9rem] shrink truncate text-xs text-muted-foreground">
                    {hint}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Without this, a name that is simply on page two reads as "not a customer". */}
      {total > rows.length && (
        <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
          Showing {rows.length} of {total}. Keep typing to narrow it down.
        </p>
      )}
    </div>
  ) : null;

  return (
    <div ref={fieldRef} className={cn('relative', className)}>
      {/* The text box stays in the dialog while the list is portalled out, so
          focus never leaves and the dialog focus trap has nothing to fight. */}
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        disabled={disabled}
        value={open ? term : label}
        placeholder={open ? (label || searchPlaceholder) : placeholder}
        onChange={(event) => { setTerm(event.target.value); setActive(0); if (!open) setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      <ChevronsUpDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50"
      />
      {open && query.isFetching && (
        <Loader2 size={14} className="absolute right-7 top-1/2 -translate-y-1/2 animate-spin opacity-50" />
      )}
      {list && createPortal(list, document.body)}
    </div>
  );
}

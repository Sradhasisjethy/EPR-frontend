/**
 * The loading / error / empty states every list screen needs, in one place.
 *
 * 25 pages carried their own `animate-pulse` skeleton and 18 their own
 * "Failed to load X" block — all visually identical, none sharing a component,
 * and several with subtly different copy for the same condition. ProductsPage
 * had already grown a local `LoadingOrError` helper, which is the same idea
 * arrived at independently.
 *
 * Adopting this is mechanical and safe, but it touches every page, so it is
 * being taken one screen at a time rather than in a single sweep across
 * modules that are otherwise untouched.
 */
export function QueryState({ query, label, children, skeletonClassName = 'w-full h-96' }) {
  if (query?.isLoading) {
    return <div className={`${skeletonClassName} rounded-xl border border-border bg-card animate-pulse`} />;
  }
  if (query?.isError) {
    return (
      <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">
        Failed to load {label}.
        {query.refetch && (
          <button onClick={() => query.refetch()} className="ml-2 underline hover:no-underline">
            Retry
          </button>
        )}
      </div>
    );
  }
  return children;
}

/** A dismissible band for an action that the server refused. */
export function ActionError({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
      <p>{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

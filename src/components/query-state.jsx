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
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-destructive/20 bg-destructive/5 glass-card shadow-sm animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-1">Data Unavailable</h3>
        <p className="text-sm text-destructive/80 mb-6 max-w-sm">
          Failed to load {label}. The server might be unreachable or returning an error.
        </p>
        {query.refetch && (
          <button 
            onClick={() => query.refetch()} 
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
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

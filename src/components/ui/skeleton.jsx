import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60 dark:bg-muted/40", className)}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="w-full space-y-4">
      {/* Table Top Controls Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Table Container Skeleton */}
      <div className="rounded-xl border border-border overflow-hidden glass-card">
        {/* Table Header */}
        <div className="flex items-center gap-4 px-6 py-3 bg-muted/30 border-b border-border">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 rounded" />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-border glass-card space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-3 w-36 rounded" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border border-border glass-card space-y-4">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="p-6 rounded-xl border border-border glass-card space-y-4">
          <Skeleton className="h-6 w-36 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

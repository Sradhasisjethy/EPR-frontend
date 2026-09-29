import { useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePaginated } from '@/hooks/use-paginated';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { DateText } from '@/components/date-text';
import { PageDescription } from '@/components/layout/page-description';
import { useUIStore } from '@/store/ui-store';
import { toast } from 'sonner';

const SEVERITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_BADGE = {
  CRITICAL: 'bg-destructive/10 text-destructive border-destructive/20',
  HIGH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  LOW: 'bg-muted text-muted-foreground border-border',
};

// Money that may appear in an alert's metadata bag; masked server-side for
// users without VIEW_RATES, so this only decides how to *render* it.
const MONEY_KEYS = ['outstandingPaise', 'balancePaise', 'valuePaise', 'amountPaise', 'creditLimitPaise'];

const MetadataCell = ({ metadata, showRates }) => {
  const entries = Object.entries(metadata || {}).filter(([, v]) => v !== null && v !== undefined);
  if (!entries.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {entries.map(([key, value]) => (
        <span key={key} className="text-muted-foreground">
          {key.replace(/Paise$/, '').replace(/([A-Z])/g, ' $1').trim()}:{' '}
          <span className="text-foreground">
            {MONEY_KEYS.includes(key) ? (showRates ? formatINR(value) : '—') : String(value)}
          </span>
        </span>
      ))}
    </div>
  );
};

export default function NotificationsPage() {
  const { glassMode } = useUIStore();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [severity, setSeverity] = useState('');

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const { query, tableProps } = usePaginated(useNotifications, {
    ...(unreadOnly ? { unreadOnly: 'true' } : {}),
    ...(severity ? { severity } : {}),
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageDescription>Alerts raised by the nightly jobs — dead stock, overdue money, curing, data integrity (M24)</PageDescription>
        <Button
          variant="outline"
          className={cn(glassMode && "glass-card border-white/20 text-foreground hover:bg-white/20 shadow-xs")}
          onClick={() => markAllRead.mutate(undefined, {
            onSuccess: () => toast.success('All alerts marked read'),
            onError: (err) => toast.error(err.response?.data?.message || 'Could not mark the alerts read.'),
          })}
          disabled={markAllRead.isPending}
        >
          <CheckCheck size={16} /> Mark all read
        </Button>
      </div>

      <div className={cn(
        "flex items-end gap-4 flex-wrap p-4 rounded-2xl border shadow-xs transition-all",
        glassMode ? "glass-card border-white/20 dark:border-white/10" : "bg-card border-border"
      )}>
        <div className="space-y-1.5 w-44">
          <Label className={cn(glassMode && "text-foreground/90 font-medium")}>Severity</Label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className={cn(
              "w-full h-9 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-ring",
              glassMode ? "glass-surface border-white/25 text-foreground" : "border-input bg-background"
            )}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s} className="bg-popover text-popover-foreground">
                {s || 'All severities'}
              </option>
            ))}
          </select>
        </div>
        <label className={cn(
          "flex items-center gap-2 text-sm h-9 cursor-pointer select-none",
          glassMode && "text-foreground/90 font-medium"
        )}>
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          />
          Unread only
        </label>
      </div>

      {query.isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load notifications.</div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'severity', header: 'Severity',
              cell: ({ row }) => (
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border', SEVERITY_BADGE[row.original.severity])}>
                  {row.original.severity}
                </span>
              ),
            },
            { id: 'type', header: 'Type', cell: ({ row }) => row.original.type.replace(/_/g, ' ') },
            {
              id: 'message', header: 'Alert',
              cell: ({ row }) => (
                <div className={cn('space-y-0.5', !row.original.readAt && 'font-medium')}>
                  <p>{row.original.title}</p>
                  <p className="text-xs text-muted-foreground">{row.original.message}</p>
                </div>
              ),
            },
            { id: 'metadata', header: 'Detail', cell: ({ row }) => <MetadataCell metadata={row.original.metadata} showRates={showRates} /> },
            { id: 'when', header: 'When', cell: ({ row }) => <DateText value={row.original.createdAt} withTime /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => (
                <div className="flex justify-end">
                  {row.original.readAt ? (
                    <span className="text-xs text-muted-foreground">Read</span>
                  ) : (
                    <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => markRead.mutate(row.original.id)}>
                      <Check size={12} /> Mark read
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search alerts…"
          emptyMessage="No notifications — nothing needs your attention."
        />
      )}
    </div>
  );
}

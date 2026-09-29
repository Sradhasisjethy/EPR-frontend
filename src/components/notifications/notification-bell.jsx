import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { DateText } from '@/components/date-text';

const SEVERITY_DOT = {
  CRITICAL: 'bg-destructive',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-muted-foreground',
};

// Where each alert type should take you when clicked (FR-M24-1 deep links).
const DEEP_LINK = {
  DEAD_STOCK: '/analytics',
  NEAR_DEAD_STOCK: '/analytics',
  NEGATIVE_STOCK: '/inventory',
  CURING_COMPLETE: '/inventory',
  STALE_RESERVATION: '/inventory',
  LEDGER_BALANCE_DRIFT: '/inventory',
  REORDER_LEVEL: '/purchasing',
  OVERDUE_RECEIVABLE: '/payments',
  NEGATIVE_CASH: '/ledger',
  CREDIT_LIMIT_BREACH: '/sales-orders',
  ORDER_PAST_DELIVERY_DATE: '/sales-orders',
  VARIANCE_APPROVAL_PENDING: '/production',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: countData } = useUnreadCount();
  // Only fetch the list while the panel is open — the bell itself only needs
  // the count, which is far cheaper to poll.
  const { data } = useNotifications({ limit: 8, unreadOnly: 'true' }, { enabled: open });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = countData?.unread ?? 0;

  useEffect(() => {
    const onClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    // pointerdown, not mousedown: a pen or finger does not always produce
    // a mouse event before the tap lands, so the menu could stay open
    // behind whatever was tapped next.
    document.addEventListener('pointerdown', onClickOutside);
    return () => document.removeEventListener('pointerdown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="p-2 rounded-full hover:bg-muted transition-colors relative"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl bg-popover/95 backdrop-blur-2xl border border-border z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 && (
              <button
                className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={() => markAllRead.mutate()}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {(data?.rows || []).length === 0 ? (
              <p className="px-4 py-8 text-sm text-center text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              data.rows.map((n) => (
                <Link
                  key={n.id}
                  to={DEEP_LINK[n.type] || '/notifications'}
                  onClick={() => { markRead.mutate(n.id); setOpen(false); }}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                >
                  <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', SEVERITY_DOT[n.severity])} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {<DateText value={n.createdAt} withTime />}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-xs text-center text-primary hover:underline border-t border-border"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

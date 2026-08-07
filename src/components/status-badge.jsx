import { cn } from '@/lib/utils';

export function StatusBadge({ status }) {
  const styles = {
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', pulse: true },
    inactive: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-500' },
    onboarding: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    terminated: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    suspended: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  };

  const style = styles[status] || styles.inactive;

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent shadow-sm", style.bg, style.text)}>
      <span className="relative flex h-2 w-2 mr-1.5">
        {style.pulse && (
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", style.dot)}></span>
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", style.dot)}></span>
      </span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

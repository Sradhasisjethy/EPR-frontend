import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';

export function PageDescription({ children, className }) {
  const { glassMode } = useUIStore();
  if (!children) return null;
  return (
    <div
      className={cn(
        glassMode
          ? 'glass-card px-4 py-2 rounded-xl border border-white/20 dark:border-white/10 shadow-xs inline-flex items-center gap-2'
          : '',
        className
      )}
    >
      <p className={cn(glassMode ? 'text-sm font-medium text-foreground/90' : 'text-sm text-muted-foreground')}>
        {children}
      </p>
    </div>
  );
}

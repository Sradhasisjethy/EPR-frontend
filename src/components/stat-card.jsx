import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';

export function StatCard({ title, value, icon: Icon, trend }) {
  const { glassMode } = useUIStore();

  return (
    <div className={cn(
      "p-6 rounded-xl transition-all duration-300 hover-lift relative overflow-hidden group border border-border",
      glassMode ? "glass-card" : "bg-card shadow-sm hover:shadow-md"
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-bold mt-1 tracking-tight">{value}</h3>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon size={24} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="flex items-center text-sm mt-4 relative z-10">
          <span className={cn("font-medium", trend >= 0 ? "text-emerald-500" : "text-destructive")}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-muted-foreground ml-2">vs last month</span>
        </div>
      )}

      <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/20 rounded-xl pointer-events-none transition-colors"></div>
    </div>
  );
}

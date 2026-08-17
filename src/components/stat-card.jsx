import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';

const VARIANTS = {
  blue: {
    iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    glow: 'bg-blue-500/10',
    hoverBorder: 'group-hover:border-blue-400/40',
  },
  emerald: {
    iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    glow: 'bg-emerald-500/10',
    hoverBorder: 'group-hover:border-emerald-400/40',
  },
  purple: {
    iconBg: 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    glow: 'bg-purple-500/10',
    hoverBorder: 'group-hover:border-purple-400/40',
  },
  amber: {
    iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    glow: 'bg-amber-500/10',
    hoverBorder: 'group-hover:border-amber-400/40',
  },
  cyan: {
    iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    glow: 'bg-cyan-500/10',
    hoverBorder: 'group-hover:border-cyan-400/40',
  },
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'blue' }) {
  const { glassMode } = useUIStore();
  const style = VARIANTS[variant] || VARIANTS.blue;

  return (
    <div className={cn(
      "p-6 rounded-2xl transition-all duration-300 hover-lift relative overflow-hidden group border",
      glassMode ? "glass-card" : "bg-card shadow-md hover:shadow-lg border-border"
    )}>
      {/* Background Accent Glow */}
      <div className={cn("absolute top-0 right-0 w-36 h-36 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-125 blur-xl pointer-events-none", style.glow)}></div>

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{title}</p>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight drop-shadow-sm">{value}</h3>
        </div>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", style.iconBg)}>
          <Icon size={24} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-2 text-xs mt-4 relative z-10">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm">
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-slate-600 dark:text-slate-300 font-medium">vs last month</span>
        </div>
      )}

      <div className={cn("absolute inset-0 border-2 border-transparent rounded-2xl pointer-events-none transition-colors", style.hoverBorder)}></div>
    </div>
  );
}
